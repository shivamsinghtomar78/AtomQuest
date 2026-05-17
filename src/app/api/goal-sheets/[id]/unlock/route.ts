import { NextRequest } from "next/server";
import { requireRole, requireSession } from "@/lib/api/auth";
import { notFound } from "@/lib/api/errors";
import { ok, route } from "@/lib/api/response";
import { unlockSheetSchema, uuidSchema } from "@/lib/api/schemas";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return route(async () => {
    const session = await requireSession();
    requireRole(session, ["admin"]);
    const { id } = await params;
    const sheetId = uuidSchema.parse(id);
    const body = unlockSheetSchema.parse(await request.json());

    const sheet = await prisma.goalSheet.findUnique({
      where: { id: sheetId },
      include: { employee: true },
    });
    if (!sheet) throw notFound("Goal sheet not found");

    const updated = await prisma.goalSheet.update({
      where: { id: sheetId },
      data: {
        status: "approved",
        lockedAt: null,
        goals: {
          updateMany: {
            where: { deletedAt: null },
            data: { isLocked: false },
          },
        },
      },
      include: { employee: true, goals: { where: { deletedAt: null } } },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "goal_sheet",
        entityId: sheet.id,
        action: "goal_unlocked",
        changedBy: session.user.id,
        changedByRole: "admin",
        previousValue: {
          status: sheet.status,
          lockedAt: sheet.lockedAt,
        },
        newValue: {
          status: updated.status,
          lockedAt: null,
        },
        reason: body.reason,
      },
    });

    await prisma.notification.create({
      data: {
        recipientId: sheet.employeeId,
        type: "goal_unlocked",
        title: "Your goal sheet was unlocked",
        body: body.reason,
        entityType: "goal_sheet",
        entityId: sheet.id,
      },
    });

    return ok(updated, "Goal sheet unlocked");
  });
}
