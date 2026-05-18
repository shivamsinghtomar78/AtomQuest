import { NextRequest } from "next/server";
import { requireSession } from "@/lib/api/auth";
import { ok, route } from "@/lib/api/response";
import { profilePatchSchema } from "@/lib/api/schemas";
import { adminAuth } from "@/lib/firebase/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  return route(async () => {
    const session = await requireSession();
    const body = profilePatchSchema.parse(await request.json());

    const existing = await prisma.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: {
        id: true,
        firebaseUid: true,
        name: true,
        department: true,
        designation: true,
      },
    });

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.department !== undefined ? { department: body.department } : {}),
        ...(body.designation !== undefined ? { designation: body.designation } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        designation: true,
        managerId: true,
      },
    });

    if (body.name !== undefined && existing.firebaseUid) {
      await adminAuth.updateUser(existing.firebaseUid, { displayName: body.name });
    }

    await prisma.auditLog.create({
      data: {
        entityType: "user",
        entityId: user.id,
        action: "profile_updated",
        changedBy: session.user.id,
        changedByRole: session.user.role,
        previousValue: {
          name: existing.name,
          department: existing.department,
          designation: existing.designation,
        },
        newValue: {
          name: user.name,
          department: user.department,
          designation: user.designation,
        },
        reason: "User updated profile details",
      },
    });

    return ok(user, "Profile updated");
  });
}
