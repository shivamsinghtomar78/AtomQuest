import { NextRequest } from "next/server";
import { requireRole, requireSession } from "@/lib/api/auth";
import { dateOnly } from "@/lib/api/business";
import { notFound } from "@/lib/api/errors";
import { ok, route } from "@/lib/api/response";
import { cyclePatchSchema, uuidSchema } from "@/lib/api/schemas";
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
    const cycleId = uuidSchema.parse(id);
    const body = cyclePatchSchema.parse(await request.json());

    const existing = await prisma.goalCycle.findUnique({ where: { id: cycleId } });
    if (!existing) throw notFound("Goal cycle not found");

    const cycle = await prisma.$transaction(async (tx) => {
      if (body.is_active === true) {
        await tx.goalCycle.updateMany({
          where: { isActive: true, id: { not: cycleId } },
          data: { isActive: false },
        });
      }

      return tx.goalCycle.update({
        where: { id: cycleId },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.goal_setting_opens !== undefined
            ? { goalSettingOpens: dateOnly(body.goal_setting_opens) }
            : {}),
          ...(body.q1_opens !== undefined ? { q1Opens: dateOnly(body.q1_opens) } : {}),
          ...(body.q2_opens !== undefined ? { q2Opens: dateOnly(body.q2_opens) } : {}),
          ...(body.q3_opens !== undefined ? { q3Opens: dateOnly(body.q3_opens) } : {}),
          ...(body.q4_opens !== undefined ? { q4Opens: dateOnly(body.q4_opens) } : {}),
          ...(body.is_active !== undefined ? { isActive: body.is_active } : {}),
        },
      });
    });

    await prisma.auditLog.create({
      data: {
        entityType: "goal_cycle",
        entityId: cycle.id,
        action: "cycle_updated",
        changedBy: session.user.id,
        changedByRole: "admin",
        previousValue: existing,
        newValue: cycle,
        reason: "Admin updated goal cycle",
      },
    });

    return ok(cycle, "Goal cycle updated");
  });
}
