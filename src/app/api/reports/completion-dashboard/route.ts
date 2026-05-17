import type { Prisma, Quarter } from "@prisma/client";
import { NextRequest } from "next/server";
import { requireSession } from "@/lib/api/auth";
import { forbidden } from "@/lib/api/errors";
import { ok, route } from "@/lib/api/response";
import { uuidSchema } from "@/lib/api/schemas";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const quarters: Quarter[] = ["Q1", "Q2", "Q3", "Q4"];

export async function GET(request: NextRequest) {
  return route(async () => {
    const session = await requireSession();
    if (session.user.role === "employee") {
      throw forbidden("Only managers and admins can access completion dashboards");
    }

    const search = request.nextUrl.searchParams;
    const cycleId = search.get("cycle_id");
    const employeeWhere: Prisma.UserWhereInput = {
      role: "employee",
      isActive: true,
      ...(session.user.role === "manager" ? { managerId: session.user.id } : {}),
    };

    const employees = await prisma.user.findMany({
      where: employeeWhere,
      select: {
        id: true,
        name: true,
        department: true,
        managerId: true,
        manager: { select: { id: true, name: true } },
      },
    });
    const employeeIds = employees.map((employee) => employee.id);

    const sheetWhere: Prisma.GoalSheetWhereInput = {
      employeeId: { in: employeeIds },
      ...(cycleId ? { cycleId: uuidSchema.parse(cycleId) } : {}),
    };

    const [sheets, checkins] = await Promise.all([
      prisma.goalSheet.findMany({
        where: sheetWhere,
        include: {
          goals: {
            where: { deletedAt: null },
            include: { quarterlyUpdates: true },
          },
          employee: { include: { manager: true } },
        },
      }),
      prisma.checkinComment.findMany({
        where: {
          sheet: sheetWhere,
        },
        include: {
          sheet: {
            include: {
              employee: { include: { manager: true } },
            },
          },
        },
      }),
    ]);

    const submitted = sheets.filter((sheet) =>
      ["submitted", "approved", "locked"].includes(sheet.status)
    ).length;
    const approved = sheets.filter((sheet) =>
      ["approved", "locked"].includes(sheet.status)
    ).length;
    const notStarted = Math.max(employees.length - sheets.length, 0);

    const checkinCompletionByQuarter = Object.fromEntries(
      quarters.map((quarter) => {
        const done = new Set(
          checkins
            .filter((checkin) => checkin.quarter === quarter)
            .map((checkin) => checkin.sheetId)
        ).size;
        return [
          quarter,
          {
            completed: done,
            pending: Math.max(sheets.length - done, 0),
          },
        ];
      })
    );

    const managers = new Map<
      string,
      {
        manager_name: string;
        total_reports: number;
        q1_done: number;
        q2_done: number;
        q3_done: number;
        q4_done: number;
      }
    >();

    for (const employee of employees) {
      const managerId = employee.manager?.id ?? "unassigned";
      const current = managers.get(managerId) ?? {
        manager_name: employee.manager?.name ?? "Unassigned",
        total_reports: 0,
        q1_done: 0,
        q2_done: 0,
        q3_done: 0,
        q4_done: 0,
      };
      current.total_reports += 1;
      managers.set(managerId, current);
    }

    for (const checkin of checkins) {
      const managerId = checkin.sheet.employee.manager?.id ?? "unassigned";
      const current = managers.get(managerId);
      if (!current) continue;
      if (checkin.quarter === "Q1") current.q1_done += 1;
      if (checkin.quarter === "Q2") current.q2_done += 1;
      if (checkin.quarter === "Q3") current.q3_done += 1;
      if (checkin.quarter === "Q4") current.q4_done += 1;
    }

    const departmentMap = new Map<
      string,
      { department: string; total: number; completed: number; at_risk_goals: number }
    >();
    for (const sheet of sheets) {
      const department = sheet.employee.department ?? "Unassigned";
      const current = departmentMap.get(department) ?? {
        department,
        total: 0,
        completed: 0,
        at_risk_goals: 0,
      };
      current.total += 1;
      if (["approved", "locked"].includes(sheet.status)) current.completed += 1;
      current.at_risk_goals += sheet.goals.filter((goal) =>
        goal.quarterlyUpdates.some(
          (update) =>
            update.status !== "completed" &&
            (update.computedScore?.toNumber() ?? 100) < 60
        )
      ).length;
      departmentMap.set(department, current);
    }

    return ok({
      goal_setting_completion: {
        total: employees.length,
        submitted,
        approved,
        pending: Math.max(employees.length - submitted - notStarted, 0),
        not_started: notStarted,
      },
      checkin_completion_by_quarter: checkinCompletionByQuarter,
      manager_checkin_rates: Array.from(managers.values()),
      department_breakdown: Array.from(departmentMap.values()).map((item) => ({
        department: item.department,
        completion_percent:
          item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0,
        at_risk_goals: item.at_risk_goals,
      })),
    });
  });
}
