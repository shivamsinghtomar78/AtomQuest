import { NextRequest } from "next/server";
import {
  assertGoalSettingOpen,
  validateSubmitGoals,
} from "@/lib/api/business";
import { badRequest, forbidden, notFound } from "@/lib/api/errors";
import { ok, route } from "@/lib/api/response";
import { uuidSchema } from "@/lib/api/schemas";
import { requireSession } from "@/lib/api/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return route(async () => {
    const session = await requireSession();
    const { id } = await params;
    const sheetId = uuidSchema.parse(id);

    const sheet = await prisma.goalSheet.findUnique({
      where: { id: sheetId },
      include: {
        employee: true,
        cycle: true,
        goals: { where: { deletedAt: null } },
      },
    });

    if (!sheet) throw notFound("Goal sheet not found");
    if (sheet.employeeId !== session.user.id) {
      throw forbidden("You can only submit your own goal sheet");
    }
    if (!["draft", "returned"].includes(sheet.status)) {
      throw badRequest("Only draft or returned goal sheets can be submitted");
    }

    assertGoalSettingOpen(sheet.cycle.goalSettingOpens);
    validateSubmitGoals(sheet);

    const updated = await prisma.goalSheet.update({
      where: { id: sheetId },
      data: {
        status: "submitted",
        submittedAt: new Date(),
        managerRemarks: null,
      },
      include: { employee: true, goals: { where: { deletedAt: null } } },
    });

    if (sheet.employee.managerId) {
      await prisma.notification.create({
        data: {
          recipientId: sheet.employee.managerId,
          type: "goal_submitted",
          title: `${sheet.employee.name} submitted goals`,
          body: "A goal sheet is ready for your approval.",
          entityType: "goal_sheet",
          entityId: sheet.id,
        },
      });
    }

    return ok(updated, "Goal sheet submitted for approval");
  });
}
