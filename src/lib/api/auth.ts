import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { adminAuth, normalizeFirebaseRole } from "@/lib/firebase/admin";
import { forbidden, unauthorized } from "./errors";
import type { PortalRole, PortalSession } from "@/lib/auth-types";

export type ApiSession = PortalSession;

async function resolveFirebaseIdentity() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("__session")?.value;
  if (!sessionCookie) throw unauthorized();

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    return {
      uid: decoded.uid,
      role: normalizeFirebaseRole(decoded.role),
      email: decoded.email ?? "",
    };
  } catch {
    throw unauthorized("Session expired");
  }
}

export async function requireSession(): Promise<ApiSession> {
  const identity = await resolveFirebaseIdentity();

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { firebaseUid: identity.uid },
        ...(identity.email ? [{ email: identity.email.toLowerCase() }] : []),
      ],
      isActive: true,
    },
    select: {
      id: true,
      firebaseUid: true,
      email: true,
      name: true,
      role: true,
      department: true,
      designation: true,
      managerId: true,
    },
  });

  if (!user) throw unauthorized("User profile not found");

  if (!user.firebaseUid) {
    await prisma.user.update({
      where: { id: user.id },
      data: { firebaseUid: identity.uid },
    });
  }

  return {
    user: {
      id: user.id,
      firebaseUid: user.firebaseUid ?? identity.uid,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
      designation: user.designation,
      managerId: user.managerId,
    },
  };
}

export function requireRole(
  session: ApiSession,
  roles: PortalRole[]
) {
  if (!roles.includes(session.user.role)) {
    throw forbidden("You do not have access to this resource");
  }
}

export function isManagerOrAdmin(session: ApiSession) {
  return session.user.role === "manager" || session.user.role === "admin";
}

export function canManageEmployee(session: ApiSession, managerId?: string | null) {
  return session.user.role === "admin" || managerId === session.user.id;
}
