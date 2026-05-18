import { requireSession } from "@/lib/api/auth";
import { ProfilePage } from "@/components/portal/profile-page";

export const dynamic = "force-dynamic";

export default async function ProfileRoute() {
  const session = await requireSession();

  return <ProfilePage session={session} />;
}
