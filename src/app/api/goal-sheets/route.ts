import type { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { requireSession } from "@/lib/api/auth";
import {
  assertGoalSettingOpen,
  requireActiveCycle,
  sheetInclude,
} from "@/lib/api/business";
import { badRequest } from "@/lib/api/errors";
import { created, ok, route } from "@/lib/api/response";
import { paginationSchema, sheetStatusSchema, uuidSchema } from "@/lib/api/schemas";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return route(async () => {
    const session = await requireSession();
    const search = request.nextUrl.searchParams;
    const pagination = paginationSchema.parse({
      page: search.get("page") ?? undefined,
      limit: search.get("limit") ?? undefined,
    });
    const cycleId = search.get("cycle_id");
    const status = search.get("status");
    const department = search.get("department");

    const where: Prisma.GoalSheetWhereInput = {};

    if (cycleId) where.cycleId = uuidSchema.parse(cycleId);
    if (status) where.status = sheetStatusSchema.parse(status);
    if (department) where.employee = { department };

    if (session.user.role === "employee") {
      const activeCycle = await requireActiveCycle();
      where.employeeId = session.user.id;
      where.cycleId = activeCycle.id;
    } else if (session.user.role === "manager") {
      where.employee = { ...(where.employee as Prisma.UserWhereInput), managerId: session.user.id };
    }

    const skip = (pagination.page - 1) * pagination.limit;

    const [items, total, statusSummary] = await Promise.all([
      prisma.goalSheet.findMany({
        where,
        include: sheetInclude,
        orderBy: { updatedAt: "desc" },
        skip: session.user.role === "admin" ? skip : undefined,
        take: session.user.role === "admin" ? pagination.limit : undefined,
      }),
      prisma.goalSheet.count({ where }),
      prisma.goalSheet.groupBy({
        by: ["status"],
        where,
        _count: { _all: true },
      }),
    ]);

    return ok({
      items,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        pages: Math.ceil(total / pagination.limit),
      },
      status_summary: statusSummary.reduce<Record<string, number>>((acc, row) => {
        acc[row.status] = row._count._all;
        return acc;
      }, {}),
    });
  });
}

export async function POST() {
  return route(async () => {
    const session = await requireSession();
    const activeCycle = await requireActiveCycle();
    assertGoalSettingOpen(activeCycle.goalSettingOpens);

    const existing = await prisma.goalSheet.findUnique({
      where: {
        employeeId_cycleId: {
          employeeId: session.user.id,
          cycleId: activeCycle.id,
        },
      },
    });

    if (existing) {
      throw badRequest("Goal sheet already exists for the active cycle");
    }

    const sheet = await prisma.goalSheet.create({
      data: {
        employeeId: session.user.id,
        cycleId: activeCycle.id,
        totalWeightage: 0,
      },
      include: sheetInclude,
    });

    return created(sheet, "Goal sheet created");
  });
}
