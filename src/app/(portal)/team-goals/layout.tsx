import type { ReactNode } from "react";
import { requirePortalRole } from "@/lib/page-auth";

export default async function TeamGoalsLayout({ children }: { children: ReactNode }) {
  await requirePortalRole(["manager", "admin"], "/dashboard", "/team-goals");

  return children;
}
