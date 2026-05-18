import { NextRequest } from "next/server";
import { requireSession } from "@/lib/api/auth";
import {
  assertGoalSettingOpen,
  assertGoalWeightageLimit,
  recalculateSheetWeightage,
  validateSubmitGoals,
} from "@/lib/api/business";
import { badRequest, forbidden, notFound } from "@/lib/api/errors";
import { ok, route } from "@/lib/api/response";
import { approveSheetSchema, uuidSchema } from "@/lib/api/schemas";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return route(async () => {
    const session = await requireSession();
    const { id } = await params;
    const sheetId = uuidSchema.parse(id);
    const body = approveSheetSchema.parse(await request.json());

    if (session.user.role === "employee") {
      throw forbidden("Only managers and admins can approve goal sheets");
    }

    const sheet = await prisma.goalSheet.findUnique({
      where: { id: sheetId },
      include: {
        employee: true,
        cycle: true,
        goals: { where: { deletedAt: null } },
      },
    });

    if (!sheet) throw notFound("Goal sheet not found");
    if (session.user.role !== "admin" && sheet.employee.managerId !== session.user.id) {
      throw forbidden("Only the direct manager can approve this goal sheet");
    }
    if (sheet.status !== "submitted") {
      throw badRequest("Only submitted goal sheets can be reviewed");
    }
    if (!body.approved && !body.remarks?.trim()) {
      throw badRequest("Remarks are required when returning a goal sheet");
    }
    assertGoalSettingOpen(sheet.cycle);

    for (const goalPatch of body.updated_goals) {
      const goal = sheet.goals.find((item) => item.id === goalPatch.id);
      if (!goal) throw badRequest(`Goal ${goalPatch.id} does not belong to this sheet`);
      if (goalPatch.weightage !== undefined) {
        await assertGoalWeightageLimit(sheetId, goalPatch.weightage, goalPatch.id);
      }

      await prisma.goal.update({
        where: { id: goalPatch.id },
        data: {
          ...(goalPatch.target_value !== undefined
            ? { targetValue: goalPatch.target_value }
            : {}),
          ...(goalPatch.target_date
            ? { targetDate: new Date(`${goalPatch.target_date}T00:00:00.000Z`) }
            : {}),
          ...(goalPatch.weightage !== undefined
            ? { weightage: goalPatch.weightage }
            : {}),
        },
      });
    }

    await recalculateSheetWeightage(sheetId);

    const refreshed = await prisma.goalSheet.findUniqueOrThrow({
      where: { id: sheetId },
      include: { goals: { where: { deletedAt: null } } },
    });
    validateSubmitGoals(refreshed);

    const updated = await prisma.goalSheet.update({
      where: { id: sheetId },
      data: body.approved
        ? {
            status: "approved",
            approvedAt: new Date(),
            approvedBy: session.user.id,
            managerRemarks: null,
            goals: {
              updateMany: {
                where: { deletedAt: null },
                data: { isLocked: true },
              },
            },
          }
        : {
            status: "returned",
            managerRemarks: body.remarks,
          },
      include: {
        employee: true,
        goals: { where: { deletedAt: null } },
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "goal_sheet",
        entityId: sheet.id,
        action: body.approved ? "goal_approved" : "goal_returned",
        changedBy: session.user.id,
        changedByRole: session.user.role,
        previousValue: { status: sheet.status },
        newValue: { status: updated.status },
        reason: body.remarks ?? null,
      },
    });

    await prisma.notification.create({
      data: {
        recipientId: sheet.employeeId,
        type: body.approved ? "goal_approved" : "goal_returned",
        title: body.approved ? "Your goals were approved" : "Your goals were returned",
        body: body.approved
          ? "Your goal sheet is now locked for the cycle."
          : body.remarks,
        entityType: "goal_sheet",
        entityId: sheet.id,
      },
    });

    return ok(updated, body.approved ? "Goal sheet approved" : "Goal sheet returned");
  });
}
