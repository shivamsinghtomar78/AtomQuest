"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  async function handleSignOut() {
    localStorage.clear();
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <button className="sign-out-button" type="button" onClick={handleSignOut}>
      Sign Out
    </button>
  );
}
