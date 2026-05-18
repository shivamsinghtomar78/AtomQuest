import { NotificationsPage } from "@/components/portal/notifications-page";
import { requireSession } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

export default async function NotificationsRoute() {
  const session = await requireSession();
  return <NotificationsPage session={session} />;
}
