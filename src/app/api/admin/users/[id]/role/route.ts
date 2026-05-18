import { NextRequest } from "next/server";
import { requireRole, requireSession } from "@/lib/api/auth";
import { notFound } from "@/lib/api/errors";
import { ok, route } from "@/lib/api/response";
import { userRolePatchSchema, uuidSchema } from "@/lib/api/schemas";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return route(async () => {
    const session = await requireSession();
    requireRole(session, ["admin"]);
    const { id } = await params;
    const userId = uuidSchema.parse(id);
    const body = userRolePatchSchema.parse(await request.json());

    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) throw notFound("User not found");
    if (existing.firebaseUid) {
      await adminAuth.setCustomUserClaims(existing.firebaseUid, { role: body.role });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role: body.role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        designation: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "user",
        entityId: user.id,
        action: "role_changed",
        changedBy: session.user.id,
        changedByRole: "admin",
        previousValue: { role: existing.role },
        newValue: { role: user.role },
        reason: body.reason ?? "Admin changed user role",
      },
    });

    return ok(user, "User role updated");
  });
}
