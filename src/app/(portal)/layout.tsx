import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/api/auth";
import { PortalShell } from "@/components/portal/portal-shell";
import { ApiError } from "@/lib/api/errors";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const session = await requireSession().catch((error) => {
    if (error instanceof ApiError && error.status === 401) {
      redirect("/login?callbackUrl=/dashboard");
    }

    throw error;
  });

  return <PortalShell session={session}>{children}</PortalShell>;
}
