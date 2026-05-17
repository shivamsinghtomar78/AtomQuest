import type { Session } from "next-auth";
import { auth } from "../../../auth";
import { forbidden, unauthorized } from "./errors";

export type ApiSession = Session & {
  user: NonNullable<Session["user"]>;
};

export async function requireSession(): Promise<ApiSession> {
  const session = await auth();
  if (!session?.user?.id) throw unauthorized();
  return session as ApiSession;
}

export function requireRole(
  session: ApiSession,
  roles: Array<"employee" | "manager" | "admin">
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
