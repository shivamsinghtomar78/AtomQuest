import type { Quarter } from "@prisma/client";
import { requireSession } from "@/lib/api/auth";
import { getWindowState, requireActiveCycle, todayDateOnly } from "@/lib/api/business";
import { ok, route } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const quarters: Quarter[] = ["Q1", "Q2", "Q3", "Q4"];

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function latestScore(goal: { quarterlyUpdates: Array<{ quarter: Quarter; computedScore: { toNumber(): number } | null }> }) {
  const latest = [...goal.quarterlyUpdates]
    .filter((update) => update.computedScore !== null)
    .sort((a, b) => quarters.indexOf(b.quarter) - quarters.indexOf(a.quarter))[0];
  return latest?.computedScore?.toNumber() ?? null;
}

function average(values: number[]) {
  if (!values.length) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function currentQuarter(cycle: {
  q1Opens: Date;
  q2Opens: Date;
  q3Opens: Date;
  q4Opens: Date;
}): Quarter {
  const today = todayDateOnly();
  if (today >= cycle.q4Opens) return "Q4";
  if (today >= cycle.q3Opens) return "Q3";
  if (today >= cycle.q2Opens) return "Q2";
  return "Q1";
}

function daysUntilClose(cycle: {
  goalSettingOpens: Date;
  q1Opens: Date;
  q2Opens: Date;
  q3Opens: Date;
  q4Opens: Date;
}, quarter: Quarter) {
  const state = getWindowState(quarter, cycle);
  if (state.closesAt.getUTCFullYear() >= 2099) return 0;
  return Math.max(Math.ceil((state.closesAt.getTime() - todayDateOnly().getTime()) / 86_400_000), 0);
}

export async function GET() {
  return route(async () => {
    const session = await requireSession();
    const cycle = await requireActiveCycle();
    const quarter = currentQuarter(cycle);

    if (session.user.role === "employee") {
      const sheet = await prisma.goalSheet.findUnique({
        where: {
          employeeId_cycleId: {
            employeeId: session.user.id,
            cycleId: cycle.id,
          },
        },
        include: {
          employee: {
            include: {
              manager: { select: { name: true, email: true } },
            },
          },
          goals: {
            where: { deletedAt: null },
            include: { quarterlyUpdates: true },
          },
        },
      });

      const goals = sheet?.goals ?? [];
      const scores = goals.map(latestScore).filter((score): score is number => score !== null);

      return ok({
        activeCycleName: cycle.name,
        activeWindowLabel: `${quarter} check-in`,
        mySheet: {
          status: sheet?.status ?? "draft",
          goalCount: goals.length,
          totalWeightage: sheet?.totalWeightage.toNumber() ?? 0,
          avgScore: average(scores),
        },
        currentQuarter: quarter,
        daysUntilWindowClose: daysUntilClose(cycle, quarter),
        myGoalsAtRisk: goals.filter((goal) => {
          const score = latestScore(goal);
          return score !== null && score < 60;
        }).length,
        myManager: sheet?.employee.manager
          ? {
              name: sheet.employee.manager.name,
              email: sheet.employee.manager.email,
              avatarInitials: initials(sheet.employee.manager.name),
            }
          : null,
        quarterCompletion: Object.fromEntries(
          quarters.map((item) => {
            if (!goals.length) return [item, 0];
            const updated = goals.filter((goal) =>
              goal.quarterlyUpdates.some((update) => update.quarter === item)
            ).length;
            return [item, Math.round((updated / goals.length) * 100)];
          })
        ),
      });
    }

    const employeeWhere =
      session.user.role === "manager"
        ? { role: "employee" as const, isActive: true, managerId: session.user.id }
        : { role: "employee" as const, isActive: true };
    const employees = await prisma.user.findMany({ where: employeeWhere, select: { id: true } });
    const employeeIds = employees.map((employee) => employee.id);
    const sheets = await prisma.goalSheet.findMany({
      where: { cycleId: cycle.id, employeeId: { in: employeeIds } },
      include: {
        goals: { where: { deletedAt: null }, include: { quarterlyUpdates: true } },
        checkinComments: true,
      },
    });

    const atRiskGoals = sheets.flatMap((sheet) => sheet.goals).filter((goal) => {
      const score = latestScore(goal);
      return score !== null && score < 60;
    }).length;

    if (session.user.role === "manager") {
      return ok({
        activeCycleName: cycle.name,
        activeWindowLabel: `${quarter} check-in`,
        teamSize: employees.length,
        sheetsApproved: sheets.filter((sheet) => ["approved", "locked"].includes(sheet.status)).length,
        sheetsSubmitted: sheets.filter((sheet) => sheet.status === "submitted").length,
        sheetsDraft: sheets.filter((sheet) => sheet.status === "draft").length,
        teamCheckInCompletion: Object.fromEntries(
          quarters.map((item) => [
            item,
            {
              done: sheets.filter((sheet) =>
                sheet.checkinComments.some((comment) => comment.quarter === item)
              ).length,
              total: employees.length,
            },
          ])
        ),
        atRiskGoalsInTeam: atRiskGoals,
        teamAverageScore: Object.fromEntries(
          quarters.map((item) => {
            const values = sheets
              .flatMap((sheet) => sheet.goals)
              .flatMap((goal) => goal.quarterlyUpdates)
              .filter((update) => update.quarter === item && update.computedScore !== null)
              .map((update) => update.computedScore!.toNumber());
            return [item, average(values)];
          })
        ),
      });
    }

    const [managers, auditLogsToday] = await Promise.all([
      prisma.user.count({ where: { role: "manager", isActive: true } }),
      prisma.auditLog.count({
        where: {
          createdAt: {
            gte: todayDateOnly(),
          },
        },
      }),
    ]);

    return ok({
      activeCycleName: cycle.name,
      activeWindowLabel: `${quarter} check-in`,
      totalEmployees: employees.length,
      totalManagers: managers,
      orgCheckInCompletion: Object.fromEntries(
        quarters.map((item) => {
          const done = sheets.filter((sheet) =>
            sheet.checkinComments.some((comment) => comment.quarter === item)
          ).length;
          return [item, employees.length ? Math.round((done / employees.length) * 100) : 0];
        })
      ),
      sheetsLocked: sheets.filter((sheet) => sheet.status === "locked").length,
      sheetsSubmitted: sheets.filter((sheet) => sheet.status === "submitted").length,
      sheetsReturned: sheets.filter((sheet) => sheet.status === "returned").length,
      sheetsDraft: sheets.filter((sheet) => sheet.status === "draft").length,
      atRiskGoalsCount: atRiskGoals,
      auditLogsToday,
    });
  });
}
