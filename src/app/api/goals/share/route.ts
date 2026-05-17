import { NextRequest } from "next/server";
import type { Goal } from "@prisma/client";
import { requireRole, requireSession } from "@/lib/api/auth";
import {
  assertGoalWeightageLimit,
  dateOnly,
  recalculateSheetWeightage,
  requireActiveCycle,
} from "@/lib/api/business";
import { badRequest, forbidden } from "@/lib/api/errors";
import { created, route } from "@/lib/api/response";
import { shareGoalSchema } from "@/lib/api/schemas";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return route(async () => {
    const session = await requireSession();
    requireRole(session, ["manager", "admin"]);
    const body = shareGoalSchema.parse(await request.json());
    await requireActiveCycle();

    const recipients = await prisma.user.findMany({
      where: {
        id: { in: body.recipient_employee_ids },
        role: "employee",
        isActive: true,
      },
      select: { id: true, managerId: true, name: true },
    });

    if (recipients.length !== body.recipient_employee_ids.length) {
      throw badRequest("One or more recipients were not found");
    }
    if (
      session.user.role === "manager" &&
      recipients.some((recipient) => recipient.managerId !== session.user.id)
    ) {
      throw forbidden("Managers can only share goals with their direct reports");
    }

    const primaryOwnerId = recipients[0]?.id;
    if (!primaryOwnerId) throw badRequest("At least one recipient is required");

    const result = await prisma.$transaction(async (tx) => {
      const createdGoals: Goal[] = [];
      let parentGoalId: string | null = null;

      for (const recipient of recipients) {
        const sheet = await tx.goalSheet.upsert({
          where: {
            employeeId_cycleId: {
              employeeId: recipient.id,
              cycleId: body.cycle_id,
            },
          },
          create: {
            employeeId: recipient.id,
            cycleId: body.cycle_id,
            totalWeightage: 0,
          },
          update: {},
          include: { goals: { where: { deletedAt: null } } },
        });

        if (sheet.goals.length >= 8) {
          throw badRequest(`${recipient.name} already has 8 goals`);
        }
        await assertGoalWeightageLimit(sheet.id, body.suggested_weightage);

        const goal: Goal = await tx.goal.create({
          data: {
            sheetId: sheet.id,
            thrustAreaId: body.thrust_area_id,
            title: body.title,
            description: body.description,
            uomType: body.uom_type,
            targetValue: body.target_value ?? null,
            targetDate: body.target_date ? dateOnly(body.target_date) : null,
            weightage: body.suggested_weightage,
            isShared: true,
            sharedFromGoalId: parentGoalId,
            primaryOwnerId,
            displayOrder: sheet.goals.length + 1,
          },
        });

        if (!parentGoalId) {
          parentGoalId = goal.id;
        }

        if (goal.id === parentGoalId) {
          await tx.goal.update({
            where: { id: goal.id },
            data: { sharedFromGoalId: null },
          });
        }

        await tx.notification.create({
          data: {
            recipientId: recipient.id,
            type: "shared_goal_received",
            title: "Shared KPI added to your goal sheet",
            body: body.title,
            entityType: "goal",
            entityId: goal.id,
          },
        });

        createdGoals.push(goal);
      }

      return { parent_goal_id: parentGoalId, goals: createdGoals };
    });

    await Promise.all(
      recipients.map(async (recipient) => {
        const sheet = await prisma.goalSheet.findUnique({
          where: {
            employeeId_cycleId: {
              employeeId: recipient.id,
              cycleId: body.cycle_id,
            },
          },
        });
        if (sheet) await recalculateSheetWeightage(sheet.id);
      })
    );

    return created(result, "Shared goal pushed to recipients");
  });
}
