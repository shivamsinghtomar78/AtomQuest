"use client";

import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { getFirebaseClient } from "@/lib/firebase/client";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    localStorage.clear();
    await signOut(getFirebaseClient().auth).catch(() => undefined);
    await fetch("/api/auth/session", { method: "DELETE" }).catch(() => undefined);
    router.replace("/login");
    router.refresh();
  }

  return (
    <button className="sign-out-button" type="button" onClick={handleSignOut}>
      Sign Out
    </button>
  );
}
