import { NextRequest } from "next/server";
import { requireRole, requireSession } from "@/lib/api/auth";
import { notFound } from "@/lib/api/errors";
import { created, ok, route } from "@/lib/api/response";
import {
  escalationRuleCreateSchema,
  escalationRulePatchSchema,
} from "@/lib/api/schemas";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  return route(async () => {
    const session = await requireSession();
    requireRole(session, ["admin"]);

    const rules = await prisma.escalationRule.findMany({
      include: { cycle: { select: { id: true, name: true, isActive: true } } },
      orderBy: [{ isActive: "desc" }, { triggerEvent: "asc" }],
    });

    return ok(rules);
  });
}

export async function POST(request: NextRequest) {
  return route(async () => {
    const session = await requireSession();
    requireRole(session, ["admin"]);
    const body = escalationRuleCreateSchema.parse(await request.json());

    const rule = await prisma.escalationRule.create({
      data: {
        cycleId: body.cycle_id,
        triggerEvent: body.trigger_event,
        daysThreshold: body.days_threshold,
        notifyEmployee: body.notify_employee,
        notifyManager: body.notify_manager,
        notifyAdmin: body.notify_admin,
        isActive: body.is_active,
      },
      include: { cycle: { select: { id: true, name: true, isActive: true } } },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "escalation_rule",
        entityId: rule.id,
        action: "escalation_rule_created",
        changedBy: session.user.id,
        changedByRole: "admin",
        newValue: rule,
        reason: "Admin created escalation rule",
      },
    });

    return created(rule, "Escalation rule created");
  });
}

export async function PATCH(request: NextRequest) {
  return route(async () => {
    const session = await requireSession();
    requireRole(session, ["admin"]);
    const body = escalationRulePatchSchema.parse(await request.json());

    const existing = await prisma.escalationRule.findUnique({ where: { id: body.id } });
    if (!existing) throw notFound("Escalation rule not found");

    const rule = await prisma.escalationRule.update({
      where: { id: body.id },
      data: {
        ...(body.cycle_id !== undefined ? { cycleId: body.cycle_id } : {}),
        ...(body.trigger_event !== undefined ? { triggerEvent: body.trigger_event } : {}),
        ...(body.days_threshold !== undefined ? { daysThreshold: body.days_threshold } : {}),
        ...(body.notify_employee !== undefined ? { notifyEmployee: body.notify_employee } : {}),
        ...(body.notify_manager !== undefined ? { notifyManager: body.notify_manager } : {}),
        ...(body.notify_admin !== undefined ? { notifyAdmin: body.notify_admin } : {}),
        ...(body.is_active !== undefined ? { isActive: body.is_active } : {}),
      },
      include: { cycle: { select: { id: true, name: true, isActive: true } } },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "escalation_rule",
        entityId: rule.id,
        action: "escalation_rule_updated",
        changedBy: session.user.id,
        changedByRole: "admin",
        previousValue: existing,
        newValue: rule,
        reason: "Admin updated escalation rule",
      },
    });

    return ok(rule, "Escalation rule updated");
  });
}
