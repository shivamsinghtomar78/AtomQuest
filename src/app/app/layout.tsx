import { ReactNode } from "react";
import { auth } from "../../../auth";
import { PortalShell } from "@/components/portal/portal-shell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  return <PortalShell session={session}>{children}</PortalShell>;
}
