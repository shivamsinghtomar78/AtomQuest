import { ReactNode } from "react";
import { requireSession } from "@/lib/api/auth";
import { PortalShell } from "@/components/portal/portal-shell";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();

  return <PortalShell session={session}>{children}</PortalShell>;
}
