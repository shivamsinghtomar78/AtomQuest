import { prisma } from "@/lib/prisma";
import { forbidden } from "./errors";
import type { PortalRole, PortalSession } from "@/lib/auth-types";

export type ApiSession = PortalSession;

const LOCAL_ADMIN_EMAIL = "local-admin@atomquest.internal";

export async function requireSession(): Promise<ApiSession> {
  const existingAdmin = await prisma.user.findFirst({
    where: {
      isActive: true,
      role: "admin",
    },
    orderBy: { createdAt: "asc" },
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

  const user =
    existingAdmin ??
    (await prisma.user.upsert({
      where: { email: LOCAL_ADMIN_EMAIL },
      update: {
        isActive: true,
        role: "admin",
      },
      create: {
        email: LOCAL_ADMIN_EMAIL,
        name: "AtomQuest Admin",
        role: "admin",
        department: "Workspace",
        designation: "Local Administrator",
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
    }));

  return {
    user: {
      id: user.id,
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
