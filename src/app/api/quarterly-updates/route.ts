import type { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import {
  assertQuarterWindowOpen,
  assertSheetAccess,
  computedScoreForGoal,
  dateOnly,
} from "@/lib/api/business";
import { badRequest, forbidden, notFound } from "@/lib/api/errors";
import { ok, route } from "@/lib/api/response";
import { quarterSchema, quarterlyUpdateSchema, uuidSchema } from "@/lib/api/schemas";
import { requireSession } from "@/lib/api/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function syncSharedAchievement(
  goalId: string,
  quarter: "Q1" | "Q2" | "Q3" | "Q4",
  data: {
    actualValue?: number | null;
    actualDate?: Date | null;
    actualZero?: boolean | null;
    status: "not_started" | "on_track" | "completed";
    employeeNotes?: string | null;
  }
) {
  const linkedGoals = await prisma.goal.findMany({
    where: {
      sharedFromGoalId: goalId,
      deletedAt: null,
    },
    select: {
      id: true,
      uomType: true,
      targetValue: true,
      targetDate: true,
    },
  });

  await Promise.all(
    linkedGoals.map((linkedGoal) =>
      prisma.quarterlyUpdate.upsert({
        where: {
          goalId_quarter: {
            goalId: linkedGoal.id,
            quarter,
          },
        },
        create: {
          goalId: linkedGoal.id,
          quarter,
          actualValue: data.actualValue,
          actualDate: data.actualDate,
          actualZero: data.actualZero,
          status: data.status,
          employeeNotes: data.employeeNotes,
          computedScore: computedScoreForGoal(linkedGoal, {
            actual_value: data.actualValue,
            actual_date: data.actualDate?.toISOString().slice(0, 10),
            actual_zero: data.actualZero,
          }),
        },
        update: {
          actualValue: data.actualValue,
          actualDate: data.actualDate,
          actualZero: data.actualZero,
          status: data.status,
          employeeNotes: data.employeeNotes,
          computedScore: computedScoreForGoal(linkedGoal, {
            actual_value: data.actualValue,
            actual_date: data.actualDate?.toISOString().slice(0, 10),
            actual_zero: data.actualZero,
          }),
        },
      })
    )
  );
}

export async function POST(request: NextRequest) {
  return route(async () => {
    const session = await requireSession();
    const body = quarterlyUpdateSchema.parse(await request.json());

    const goal = await prisma.goal.findFirst({
      where: { id: body.goal_id, deletedAt: null },
      include: {
        sheet: {
          include: {
            cycle: true,
            employee: true,
          },
        },
      },
    });

    if (!goal) throw notFound("Goal not found");
    if (goal.sheet.employeeId !== session.user.id) {
      throw forbidden("You can only update your own goals");
    }
    if (goal.isShared && goal.primaryOwnerId && goal.primaryOwnerId !== session.user.id) {
      throw forbidden("Shared goal achievements are updated by the primary owner");
    }

    assertQuarterWindowOpen(goal.sheet.cycle, body.quarter);

    const actualDate = body.actual_date ? dateOnly(body.actual_date) : null;
    const computedScore = computedScoreForGoal(goal, body);

    const update = await prisma.quarterlyUpdate.upsert({
      where: {
        goalId_quarter: {
          goalId: goal.id,
          quarter: body.quarter,
        },
      },
      create: {
        goalId: goal.id,
        quarter: body.quarter,
        actualValue: body.actual_value ?? null,
        actualDate,
        actualZero: body.actual_zero ?? null,
        status: body.status,
        employeeNotes: body.employee_notes,
        computedScore,
      },
      update: {
        actualValue: body.actual_value ?? null,
        actualDate,
        actualZero: body.actual_zero ?? null,
        status: body.status,
        employeeNotes: body.employee_notes,
        computedScore,
      },
    });

    if (goal.isShared && goal.primaryOwnerId === session.user.id) {
      await syncSharedAchievement(goal.id, body.quarter, {
        actualValue: body.actual_value ?? null,
        actualDate,
        actualZero: body.actual_zero ?? null,
        status: body.status,
        employeeNotes: "Synced from primary shared KPI owner.",
      });
    }

    return ok(update, "Quarterly update saved");
  });
}

export async function GET(request: NextRequest) {
  return route(async () => {
    const session = await requireSession();
    const search = request.nextUrl.searchParams;
    const sheetId = search.get("sheet_id");
    const quarter = search.get("quarter");

    if (!sheetId) throw badRequest("sheet_id is required");
    const sheet = await assertSheetAccess(session, uuidSchema.parse(sheetId));
    const where: Prisma.QuarterlyUpdateWhereInput = {
      goal: { sheetId: sheet.id, deletedAt: null },
    };
    if (quarter) where.quarter = quarterSchema.parse(quarter);

    const updates = await prisma.quarterlyUpdate.findMany({
      where,
      include: {
        goal: {
          include: {
            thrustArea: true,
          },
        },
      },
      orderBy: [{ goal: { displayOrder: "asc" } }, { quarter: "asc" }],
    });

    const grouped = updates.reduce<Record<string, typeof updates>>((acc, update) => {
      acc[update.goalId] ??= [];
      acc[update.goalId].push(update);
      return acc;
    }, {});

    return ok({ sheet_id: sheet.id, updates, grouped_by_goal: grouped });
  });
}
