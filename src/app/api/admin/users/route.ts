import type { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { requireRole, requireSession } from "@/lib/api/auth";
import { created, ok, route } from "@/lib/api/response";
import { paginationSchema, roleSchema, userCreateSchema } from "@/lib/api/schemas";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return route(async () => {
    const session = await requireSession();
    requireRole(session, ["admin"]);
    const search = request.nextUrl.searchParams;
    const pagination = paginationSchema.parse({
      page: search.get("page") ?? undefined,
      limit: search.get("limit") ?? undefined,
    });
    const role = search.get("role");
    const department = search.get("department");

    const where: Prisma.UserWhereInput = {};
    if (role) where.role = roleSchema.parse(role);
    if (department) where.department = department;

    const skip = (pagination.page - 1) * pagination.limit;
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          department: true,
          designation: true,
          managerId: true,
          employeeCode: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { name: "asc" },
        skip,
        take: pagination.limit,
      }),
      prisma.user.count({ where }),
    ]);

    return ok({
      items,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        pages: Math.ceil(total / pagination.limit),
      },
    });
  });
}

export async function POST(request: NextRequest) {
  return route(async () => {
    const session = await requireSession();
    requireRole(session, ["admin"]);
    const body = userCreateSchema.parse(await request.json());

    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        role: body.role,
        department: body.department,
        designation: body.designation,
        managerId: body.manager_id,
        employeeCode: body.employee_code,
        avatarUrl: body.avatar_url,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        designation: true,
        managerId: true,
        employeeCode: true,
        isActive: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "user",
        entityId: user.id,
        action: "user_created",
        changedBy: session.user.id,
        changedByRole: "admin",
        newValue: user,
        reason: "Admin created user",
      },
    });

    return created(user, "User created");
  });
}
