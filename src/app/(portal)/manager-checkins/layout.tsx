import type { ReactNode } from "react";
import { requirePortalRole } from "@/lib/page-auth";

export default async function ManagerCheckinsLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requirePortalRole(["manager", "admin"], "/checkins", "/manager-checkins");

  return children;
}
