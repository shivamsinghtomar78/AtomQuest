import { NextRequest } from "next/server";
import {
  assertGoalAccess,
  assertGoalSettingOpen,
  assertGoalWeightageLimit,
  dateOnly,
  goalInclude,
  recalculateSheetWeightage,
} from "@/lib/api/business";
import { badRequest, forbidden } from "@/lib/api/errors";
import { ok, route } from "@/lib/api/response";
import { goalPatchSchema, uuidSchema } from "@/lib/api/schemas";
import { requireSession } from "@/lib/api/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return route(async () => {
    const session = await requireSession();
    const { id } = await params;
    const goalId = uuidSchema.parse(id);
    const body = goalPatchSchema.parse(await request.json());
    const goal = await assertGoalAccess(session, goalId);

    if (goal.isLocked && session.user.role !== "admin") {
      throw forbidden("Locked goals can only be edited by an admin");
    }

    const isOwner = goal.sheet.employeeId === session.user.id;
    const isManager =
      session.user.role === "manager" && goal.sheet.employee.managerId === session.user.id;

    if (isOwner && !["draft", "returned"].includes(goal.sheet.status)) {
      throw forbidden("Employees can only edit goals while draft or returned");
    }
    if (isManager && goal.sheet.status !== "submitted") {
      throw forbidden("Managers can only edit goals during approval review");
    }
    if (!isOwner && !isManager && session.user.role !== "admin") {
      throw forbidden("You cannot edit this goal");
    }
    assertGoalSettingOpen(goal.sheet.cycle);

    if (body.weightage !== undefined) {
      await assertGoalWeightageLimit(goal.sheetId, body.weightage, goal.id);
    }

    const previousValue = {
      title: goal.title,
      targetValue: goal.targetValue?.toString() ?? null,
      weightage: goal.weightage.toString(),
      isLocked: goal.isLocked,
    };

    const updated = await prisma.goal.update({
      where: { id: goal.id },
      data: {
        ...(body.thrust_area_id ? { thrustAreaId: body.thrust_area_id } : {}),
        ...(body.title ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.uom_type ? { uomType: body.uom_type } : {}),
        ...(body.target_value !== undefined
          ? { targetValue: body.target_value }
          : {}),
        ...(body.target_date !== undefined
          ? { targetDate: body.target_date ? dateOnly(body.target_date) : null }
          : {}),
        ...(body.weightage !== undefined ? { weightage: body.weightage } : {}),
      },
      include: goalInclude,
    });

    await recalculateSheetWeightage(goal.sheetId);

    if (goal.isLocked || session.user.role === "admin") {
      await prisma.auditLog.create({
        data: {
          entityType: "goal",
          entityId: goal.id,
          action: "goal_updated",
          changedBy: session.user.id,
          changedByRole: session.user.role,
          previousValue,
          newValue: {
            title: updated.title,
            targetValue: updated.targetValue?.toString() ?? null,
            weightage: updated.weightage.toString(),
          },
          reason: session.user.role === "admin" ? "Admin goal edit" : null,
        },
      });
    }

    return ok(updated, "Goal updated");
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return route(async () => {
    const session = await requireSession();
    const { id } = await params;
    const goal = await assertGoalAccess(session, uuidSchema.parse(id));

    const isOwner = goal.sheet.employeeId === session.user.id;
    if (!isOwner && session.user.role !== "admin") {
      throw forbidden("Only the sheet owner or an admin can delete a goal");
    }
    if (isOwner && !["draft", "returned"].includes(goal.sheet.status)) {
      throw forbidden("Goals can only be deleted while draft or returned");
    }
    if (goal.isShared && session.user.role !== "admin") {
      throw forbidden("Shared goals can only be removed by an admin");
    }
    if (goal.isLocked && session.user.role !== "admin") {
      throw forbidden("Locked goals can only be deleted by an admin");
    }
    assertGoalSettingOpen(goal.sheet.cycle);

    await prisma.goal.update({
      where: { id: goal.id },
      data: { deletedAt: new Date() },
    });
    const totalWeightage = await recalculateSheetWeightage(goal.sheetId);

    if (session.user.role === "admin" || goal.isLocked) {
      await prisma.auditLog.create({
        data: {
          entityType: "goal",
          entityId: goal.id,
          action: "goal_soft_deleted",
          changedBy: session.user.id,
          changedByRole: session.user.role,
          previousValue: { deletedAt: goal.deletedAt },
          newValue: { deletedAt: new Date().toISOString() },
          reason: "Goal soft deleted",
        },
      });
    }

    return ok({ id: goal.id, total_weightage: totalWeightage }, "Goal deleted");
  });
}
