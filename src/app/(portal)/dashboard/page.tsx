import { requireSession } from "@/lib/api/auth";
import { DashboardPage } from "@/components/portal/dashboard-page";
import { ApiError } from "@/lib/api/errors";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardRoute() {
  const session = await requireSession().catch((error) => {
    if (error instanceof ApiError && error.status === 401) {
      redirect("/login?callbackUrl=/dashboard");
    }

    throw error;
  });

  return <DashboardPage session={session} />;
}
