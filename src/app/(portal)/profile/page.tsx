import { requireSession } from "@/lib/api/auth";
import { ProfilePage } from "@/components/portal/profile-page";
import { ApiError } from "@/lib/api/errors";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ProfileRoute() {
  const session = await requireSession().catch((error) => {
    if (error instanceof ApiError && error.status === 401) {
      redirect("/login?callbackUrl=/profile");
    }

    throw error;
  });

  return <ProfilePage session={session} />;
}
