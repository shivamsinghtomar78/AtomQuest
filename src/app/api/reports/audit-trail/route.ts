import type { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { requireRole, requireSession } from "@/lib/api/auth";
import { ok, route } from "@/lib/api/response";
import { paginationSchema, uuidSchema } from "@/lib/api/schemas";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function readableDiff(previousValue: unknown, newValue: unknown) {
  if (!previousValue || !newValue) return [];
  if (
    typeof previousValue !== "object" ||
    typeof newValue !== "object" ||
    Array.isArray(previousValue) ||
    Array.isArray(newValue)
  ) {
    return [{ field: "value", from: previousValue, to: newValue }];
  }

  const previous = previousValue as Record<string, unknown>;
  const next = newValue as Record<string, unknown>;
  return Array.from(new Set([...Object.keys(previous), ...Object.keys(next)]))
    .filter((key) => JSON.stringify(previous[key]) !== JSON.stringify(next[key]))
    .map((key) => ({ field: key, from: previous[key], to: next[key] }));
}

export async function GET(request: NextRequest) {
  return route(async () => {
    const session = await requireSession();
    requireRole(session, ["admin"]);

    const search = request.nextUrl.searchParams;
    const pagination = paginationSchema.parse({
      page: search.get("page") ?? undefined,
      limit: search.get("limit") ?? undefined,
    });

    const where: Prisma.AuditLogWhereInput = {};
    const entityType = search.get("entity_type");
    const entityId = search.get("entity_id");
    const changedBy = search.get("changed_by");
    const from = search.get("from");
    const to = search.get("to");

    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = uuidSchema.parse(entityId);
    if (changedBy) where.changedBy = uuidSchema.parse(changedBy);
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const skip = (pagination.page - 1) * pagination.limit;
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pagination.limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return ok({
      items: items.map((item) => ({
        ...item,
        readable_diff: readableDiff(item.previousValue, item.newValue),
      })),
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        pages: Math.ceil(total / pagination.limit),
      },
    });
  });
}
