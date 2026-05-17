import { NextRequest } from "next/server";
import { requireRole, requireSession } from "@/lib/api/auth";
import { dateOnly } from "@/lib/api/business";
import { created, ok, route } from "@/lib/api/response";
import { cycleCreateSchema } from "@/lib/api/schemas";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  return route(async () => {
    const session = await requireSession();
    requireRole(session, ["admin"]);

    const cycles = await prisma.goalCycle.findMany({
      orderBy: { goalSettingOpens: "desc" },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return ok(cycles);
  });
}

export async function POST(request: NextRequest) {
  return route(async () => {
    const session = await requireSession();
    requireRole(session, ["admin"]);
    const body = cycleCreateSchema.parse(await request.json());

    const cycle = await prisma.$transaction(async (tx) => {
      if (body.is_active) {
        await tx.goalCycle.updateMany({
          where: { isActive: true },
          data: { isActive: false },
        });
      }

      return tx.goalCycle.create({
        data: {
          name: body.name,
          goalSettingOpens: dateOnly(body.goal_setting_opens),
          q1Opens: dateOnly(body.q1_opens),
          q2Opens: dateOnly(body.q2_opens),
          q3Opens: dateOnly(body.q3_opens),
          q4Opens: dateOnly(body.q4_opens),
          isActive: body.is_active,
          createdBy: session.user.id,
        },
      });
    });

    await prisma.auditLog.create({
      data: {
        entityType: "goal_cycle",
        entityId: cycle.id,
        action: "cycle_created",
        changedBy: session.user.id,
        changedByRole: "admin",
        newValue: {
          name: cycle.name,
          isActive: cycle.isActive,
        },
        reason: "Admin created goal cycle",
      },
    });

    return created(cycle, "Goal cycle created");
  });
}
