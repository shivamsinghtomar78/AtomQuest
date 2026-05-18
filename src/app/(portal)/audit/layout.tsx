import type { ReactNode } from "react";
import { requirePortalRole } from "@/lib/page-auth";

export default async function AuditLayout({ children }: { children: ReactNode }) {
  await requirePortalRole(["admin"], "/dashboard", "/audit");

  return children;
}
