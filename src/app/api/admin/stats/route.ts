import { requireRole, requireSession } from "@/lib/api/auth";
import { ok, route } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  return route(async () => {
    const session = await requireSession();
    requireRole(session, ["admin"]);

    const [users, sheets, goals, checkins] = await Promise.all([
      prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
      prisma.goalSheet.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.goal.findMany({
        where: { deletedAt: null },
        include: { quarterlyUpdates: true },
      }),
      prisma.checkinComment.count(),
    ]);

    const atRiskGoals = goals.filter((goal) =>
      goal.quarterlyUpdates.some(
        (update) => update.status !== "completed" && (update.computedScore?.toNumber() ?? 100) < 60
      )
    ).length;

    return ok({
      user_counts: users.reduce<Record<string, number>>((acc, row) => {
        acc[row.role] = row._count._all;
        return acc;
      }, {}),
      sheet_counts: sheets.reduce<Record<string, number>>((acc, row) => {
        acc[row.status] = row._count._all;
        return acc;
      }, {}),
      total_goals: goals.length,
      at_risk_goals: atRiskGoals,
      total_checkins: checkins,
    });
  });
}
