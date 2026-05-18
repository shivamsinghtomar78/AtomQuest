import type { ReactNode } from "react";
import { requirePortalRole } from "@/lib/page-auth";

export default async function ReportsLayout({ children }: { children: ReactNode }) {
  await requirePortalRole(["manager", "admin"], "/dashboard", "/reports");

  return children;
}
