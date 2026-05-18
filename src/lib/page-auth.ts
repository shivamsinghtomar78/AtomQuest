import { redirect } from "next/navigation";
import { requireSession } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/errors";
import type { PortalRole } from "@/lib/auth-types";

export async function requirePortalRole(
  roles: PortalRole[],
  forbiddenRedirectPath: string,
  callbackPath: string
) {
  const session = await requireSession().catch((error) => {
    if (error instanceof ApiError && error.status === 401) {
      redirect(`/login?callbackUrl=${encodeURIComponent(callbackPath)}`);
    }

    throw error;
  });

  if (!roles.includes(session.user.role)) {
    redirect(forbiddenRedirectPath);
  }

  return session;
}
