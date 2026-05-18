import { redirect } from "next/navigation";
import { requireSession } from "@/lib/api/auth";
import type { PortalRole } from "@/lib/auth-types";

export async function requirePortalRole(
  roles: PortalRole[],
  forbiddenRedirectPath: string,
  _callbackPath: string
) {
  const session = await requireSession();

  if (!roles.includes(session.user.role)) {
    redirect(forbiddenRedirectPath);
  }

  return session;
}
