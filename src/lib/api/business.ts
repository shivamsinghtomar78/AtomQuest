import type { Prisma, Quarter, UomType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeProgressScore } from "@/lib/scoring";
import { badRequest, forbidden, notFound, windowClosed } from "./errors";
import type { ApiSession } from "./auth";

export const goalInclude = {
  thrustArea: true,
  quarterlyUpdates: {
    orderBy: { quarter: "asc" as const },
  },
};

export const sheetInclude = {
  employee: {
    select: {
      id: true,
      name: true,
      email: true,
      department: true,
      designation: true,
      employeeCode: true,
      managerId: true,
    },
  },
  cycle: true,
  goals: {
    where: { deletedAt: null },
    orderBy: { displayOrder: "asc" as const },
    include: goalInclude,
  },
  checkinComments: {
    orderBy: { checkinDate: "desc" as const },
  },
};

export function dateOnly(value: string | Date) {
  if (value instanceof Date) {
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
    );
  }

  return new Date(`${value}T00:00:00.000Z`);
}

export function todayDateOnly() {
  return dateOnly(new Date());
}

export type CycleWindows = {
  goalSettingOpens: Date;
  q1Opens: Date;
  q2Opens: Date;
  q3Opens: Date;
  q4Opens: Date;
};

export type WindowName = "goal_setting" | Quarter;

const windowLabels: Record<WindowName, string> = {
  goal_setting: "Goal setting",
  Q1: "Q1 check-in",
  Q2: "Q2 check-in",
  Q3: "Q3 check-in",
  Q4: "Q4 check-in",
};

function windowOpenMap(cycle: CycleWindows) {
  return {
    goal_setting: dateOnly(cycle.goalSettingOpens),
    Q1: dateOnly(cycle.q1Opens),
    Q2: dateOnly(cycle.q2Opens),
    Q3: dateOnly(cycle.q3Opens),
    Q4: dateOnly(cycle.q4Opens),
  } satisfies Record<WindowName, Date>;
}

function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function getWindowState(window: WindowName, cycle: CycleWindows, now = todayDateOnly()) {
  const opens = windowOpenMap(cycle);
  const openDate = opens[window];
  const nextOpen = Object.values(opens)
    .filter((date) => date.getTime() > openDate.getTime())
    .sort((a, b) => a.getTime() - b.getTime())[0];
  const closeDate = nextOpen ?? dateOnly("2099-01-01");
  const isOpen = now >= openDate && now < closeDate;
  const closesOn = new Date(closeDate.getTime() - 86_400_000);
  const daysUntilOpen = Math.ceil((openDate.getTime() - now.getTime()) / 86_400_000);

  return {
    window,
    isOpen,
    opensAt: openDate,
    closesAt: closeDate,
    closesOn,
    daysUntilOpen: Math.max(daysUntilOpen, 0),
  };
}

export function assertWindowOpen(window: WindowName, cycle: CycleWindows) {
  const state = getWindowState(window, cycle);

  if (state.isOpen) return state;

  if (todayDateOnly() < state.opensAt) {
    throw windowClosed(
      `${windowLabels[window]} window opens ${formatLongDate(state.opensAt)}.`,
      state
    );
  }

  throw windowClosed(
    `${windowLabels[window]} window closed on ${formatLongDate(state.closesOn)}.`,
    state
  );
}

export async function getActiveCycle() {
  return prisma.goalCycle.findFirst({
    where: { isActive: true },
    orderBy: { goalSettingOpens: "desc" },
  });
}

export async function requireActiveCycle() {
  const cycle = await getActiveCycle();
  if (!cycle) throw badRequest("No active goal cycle is configured");
  return cycle;
}

export function assertGoalSettingOpen(cycle: CycleWindows) {
  assertWindowOpen("goal_setting", cycle);
}

export function assertQuarterWindowOpen(
  cycle: CycleWindows,
  quarter: Quarter
) {
  assertWindowOpen(quarter, cycle);
}

export async function recalculateSheetWeightage(sheetId: string) {
  const aggregate = await prisma.goal.aggregate({
    where: { sheetId, deletedAt: null },
    _sum: { weightage: true },
  });
  const total = aggregate._sum.weightage?.toNumber() ?? 0;

  await prisma.goalSheet.update({
    where: { id: sheetId },
    data: { totalWeightage: total },
  });

  return total;
}

export async function assertSheetAccess(session: ApiSession, sheetId: string) {
  const sheet = await prisma.goalSheet.findUnique({
    where: { id: sheetId },
    include: sheetInclude,
  });

  if (!sheet) throw notFound("Goal sheet not found");

  const isOwner = sheet.employeeId === session.user.id;
  const isDirectManager = sheet.employee.managerId === session.user.id;
  const isAdmin = session.user.role === "admin";

  if (!isOwner && !isDirectManager && !isAdmin) {
    throw forbidden("You do not have access to this goal sheet");
  }

  return sheet;
}

export async function assertSheetOwnerCanEdit(session: ApiSession, sheetId: string) {
  const sheet = await prisma.goalSheet.findUnique({
    where: { id: sheetId },
    include: { employee: true, cycle: true, goals: { where: { deletedAt: null } } },
  });

  if (!sheet) throw notFound("Goal sheet not found");
  if (sheet.employeeId !== session.user.id) {
    throw forbidden("You can only edit your own goal sheet");
  }
  if (!["draft", "returned"].includes(sheet.status)) {
    throw forbidden("Goal sheet can only be edited while draft or returned");
  }
  assertGoalSettingOpen(sheet.cycle);

  return sheet;
}

export async function assertGoalAccess(session: ApiSession, goalId: string) {
  const goal = await prisma.goal.findFirst({
    where: { id: goalId, deletedAt: null },
    include: {
      sheet: { include: { employee: true, cycle: true, goals: { where: { deletedAt: null } } } },
      thrustArea: true,
    },
  });

  if (!goal) throw notFound("Goal not found");

  const isOwner = goal.sheet.employeeId === session.user.id;
  const isDirectManager = goal.sheet.employee.managerId === session.user.id;
  const isAdmin = session.user.role === "admin";

  if (!isOwner && !isDirectManager && !isAdmin) {
    throw forbidden("You do not have access to this goal");
  }

  return goal;
}

export async function assertGoalWeightageLimit(
  sheetId: string,
  nextWeightage: number,
  existingGoalId?: string
) {
  const goals = await prisma.goal.findMany({
    where: {
      sheetId,
      deletedAt: null,
      ...(existingGoalId ? { id: { not: existingGoalId } } : {}),
    },
    select: { weightage: true },
  });

  const total =
    goals.reduce((sum, goal) => sum + goal.weightage.toNumber(), 0) +
    nextWeightage;

  if (total > 100.01) {
    throw badRequest("Total goal weightage cannot exceed 100%");
  }

  return total;
}

export function validateSubmitGoals(
  sheet: { goals: Array<{
    title: string;
    thrustAreaId: string;
    uomType: UomType;
    targetValue: Prisma.Decimal | null;
    targetDate: Date | null;
    weightage: Prisma.Decimal;
  }> }
) {
  const errors: Array<{ field: string; message: string }> = [];
  const goals = sheet.goals;

  if (goals.length < 1) {
    errors.push({ field: "goals", message: "At least one goal is required" });
  }
  if (goals.length > 8) {
    errors.push({ field: "goals", message: "Maximum 8 goals are allowed" });
  }

  const total = goals.reduce((sum, goal) => sum + goal.weightage.toNumber(), 0);
  if (Math.abs(total - 100) > 0.01) {
    errors.push({
      field: "total_weightage",
      message: "Total weightage must equal exactly 100%",
    });
  }

  goals.forEach((goal, index) => {
    const prefix = `goals.${index}`;
    if (goal.weightage.toNumber() < 10) {
      errors.push({
        field: `${prefix}.weightage`,
        message: "Each goal must have at least 10% weightage",
      });
    }
    if (!goal.title || !goal.thrustAreaId) {
      errors.push({
        field: `${prefix}.title`,
        message: "Goal title and thrust area are required",
      });
    }
    if (
      ["min_numeric", "min_percent", "max_numeric", "max_percent"].includes(
        goal.uomType
      ) &&
      goal.targetValue === null
    ) {
      errors.push({
        field: `${prefix}.target_value`,
        message: "Target value is required",
      });
    }
    if (goal.uomType === "timeline" && !goal.targetDate) {
      errors.push({
        field: `${prefix}.target_date`,
        message: "Target date is required",
      });
    }
  });

  if (errors.length > 0) throw badRequest("Goal sheet validation failed", errors);
}

export function computedScoreForGoal(goal: {
  uomType: UomType;
  targetValue: Prisma.Decimal | null;
  targetDate: Date | null;
}, update: {
  actual_value?: number | null;
  actual_date?: string | null;
  actual_zero?: boolean | null;
}) {
  return computeProgressScore({
    uomType: goal.uomType,
    targetValue: goal.targetValue,
    targetDate: goal.targetDate,
    actualValue: update.actual_value,
    actualDate: update.actual_date ? dateOnly(update.actual_date) : null,
    actualZero: update.actual_zero,
  });
}

export function csvEscape(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv(rows: unknown[][]) {
  return rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
}

export async function notify(data: {
  recipientId: string;
  type: string;
  title: string;
  body?: string | null;
  entityType?: string | null;
  entityId?: string | null;
}) {
  return prisma.notification.create({ data });
}
