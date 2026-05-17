import { auth } from "../../../../auth";
import { ProfilePage } from "@/components/portal/profile-page";

export default async function ProfileRoute() {
  const session = await auth();

  return <ProfilePage session={session} />;
}
