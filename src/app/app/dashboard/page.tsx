import { auth } from "../../../../auth";
import { DashboardPage } from "@/components/portal/dashboard-page";

export default async function DashboardRoute() {
  const session = await auth();

  return <DashboardPage session={session} />;
}
