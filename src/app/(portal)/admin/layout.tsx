import type { ReactNode } from "react";
import { requirePortalRole } from "@/lib/page-auth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requirePortalRole(["admin"], "/dashboard", "/admin");

  return children;
}
