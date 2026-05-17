import type { Prisma, Quarter } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api/auth";
import { csvEscape, toCsv } from "@/lib/api/business";
import { forbidden } from "@/lib/api/errors";
import { ok, route } from "@/lib/api/response";
import { quarterSchema, uuidSchema } from "@/lib/api/schemas";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const quarters: Quarter[] = ["Q1", "Q2", "Q3", "Q4"];

const columns = [
  "Employee Name",
  "Employee Code",
  "Department",
  "Goal Title",
  "Thrust Area",
  "UoM Type",
  "Target",
  "Q1 Actual",
  "Q2 Actual",
  "Q3 Actual",
  "Q4 Actual",
  "Q1 Score%",
  "Q2 Score%",
  "Q3 Score%",
  "Q4 Score%",
  "Weightage%",
  "Weighted Score",
];

function actualFor(update?: {
  actualValue: Prisma.Decimal | null;
  actualDate: Date | null;
  actualZero: boolean | null;
}) {
  if (!update) return "";
  if (update.actualDate) return update.actualDate.toISOString().slice(0, 10);
  if (update.actualZero !== null) return update.actualZero ? 0 : 1;
  return update.actualValue?.toString() ?? "";
}

function targetFor(goal: {
  targetValue: Prisma.Decimal | null;
  targetDate: Date | null;
}) {
  return goal.targetDate?.toISOString().slice(0, 10) ?? goal.targetValue?.toString() ?? "";
}

export async function GET(request: NextRequest) {
  return route(async () => {
    const session = await requireSession();
    if (session.user.role === "employee") {
      throw forbidden("Only managers and admins can access achievement reports");
    }

    const search = request.nextUrl.searchParams;
    const cycleId = search.get("cycle_id");
    const department = search.get("department");
    const quarter = search.get("quarter");
    const format = search.get("format") ?? "json";

    const where: Prisma.GoalSheetWhereInput = {};
    if (cycleId) where.cycleId = uuidSchema.parse(cycleId);
    if (department) where.employee = { department };
    if (session.user.role === "manager") {
      where.employee = {
        ...(where.employee as Prisma.UserWhereInput),
        managerId: session.user.id,
      };
    }

    const quarterFilter = quarter ? quarterSchema.parse(quarter) : null;

    const sheets = await prisma.goalSheet.findMany({
      where,
      include: {
        employee: true,
        goals: {
          where: { deletedAt: null },
          include: {
            thrustArea: true,
            quarterlyUpdates: {
              where: quarterFilter ? { quarter: quarterFilter } : undefined,
            },
          },
          orderBy: { displayOrder: "asc" },
        },
      },
      orderBy: { employee: { name: "asc" } },
    });

    const rows = sheets.flatMap((sheet) =>
      sheet.goals.map((goal) => {
        const updatesByQuarter = new Map(
          goal.quarterlyUpdates.map((update) => [update.quarter, update])
        );
        const averageScore =
          goal.quarterlyUpdates.length > 0
            ? goal.quarterlyUpdates.reduce(
                (sum, update) => sum + (update.computedScore?.toNumber() ?? 0),
                0
              ) / goal.quarterlyUpdates.length
            : 0;
        const weightedScore =
          Math.round(averageScore * goal.weightage.toNumber()) / 100;

        return {
          employee_name: sheet.employee.name,
          employee_code: sheet.employee.employeeCode,
          department: sheet.employee.department,
          goal_title: goal.title,
          thrust_area: goal.thrustArea.name,
          uom_type: goal.uomType,
          target: targetFor(goal),
          q1_actual: actualFor(updatesByQuarter.get("Q1")),
          q2_actual: actualFor(updatesByQuarter.get("Q2")),
          q3_actual: actualFor(updatesByQuarter.get("Q3")),
          q4_actual: actualFor(updatesByQuarter.get("Q4")),
          q1_score: updatesByQuarter.get("Q1")?.computedScore?.toString() ?? "",
          q2_score: updatesByQuarter.get("Q2")?.computedScore?.toString() ?? "",
          q3_score: updatesByQuarter.get("Q3")?.computedScore?.toString() ?? "",
          q4_score: updatesByQuarter.get("Q4")?.computedScore?.toString() ?? "",
          weightage: goal.weightage.toString(),
          weighted_score: weightedScore,
        };
      })
    );

    if (format === "csv") {
      const csvRows = [
        columns,
        ...rows.map((row) => [
          row.employee_name,
          row.employee_code,
          row.department,
          row.goal_title,
          row.thrust_area,
          row.uom_type,
          row.target,
          row.q1_actual,
          row.q2_actual,
          row.q3_actual,
          row.q4_actual,
          row.q1_score,
          row.q2_score,
          row.q3_score,
          row.q4_score,
          row.weightage,
          row.weighted_score,
        ]),
      ];

      return new NextResponse(toCsv(csvRows), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="atomquest-achievement-report.csv"',
        },
      });
    }

    return ok({ columns, rows });
  });
}
