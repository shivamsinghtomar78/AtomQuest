import { requireSession } from "@/lib/api/auth";
import { DashboardPage } from "@/components/portal/dashboard-page";

export const dynamic = "force-dynamic";

export default async function DashboardRoute() {
  const session = await requireSession();

  return <DashboardPage session={session} />;
}
