"use client";

import { useState } from "react";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRound, Save } from "lucide-react";
import { getPortalUser } from "@/lib/portal-data";
import { Button } from "@/components/ui/button";
import { PortalCard } from "@/components/portal/portal-ui";
import type { PortalSession } from "@/lib/auth-types";
import { apiJson, jsonRequest } from "@/lib/api/client";
import { getFirebaseClient } from "@/lib/firebase/client";

export function ProfilePage({ session }: { session: PortalSession | null }) {
  const router = useRouter();
  const user = getPortalUser(session);
  const [name, setName] = useState(user.name);
  const [department, setDepartment] = useState(user.department);
  const [designation, setDesignation] = useState(user.designation);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const saveProfile = useMutation({
    mutationFn: () =>
      apiJson("/api/users/me", jsonRequest("PATCH", {
        name,
        department,
        designation,
      })),
    onSuccess: () => {
      toast.success("Profile saved");
      router.refresh();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to save profile"),
  });

  const passwordReady =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    newPassword === confirmPassword;

  const changePassword = useMutation({
    mutationFn: async () => {
      if (!passwordReady) {
        throw new Error("Enter the current password and matching new password.");
      }

      const auth = getFirebaseClient().auth;
      const currentUser = auth.currentUser;
      if (!currentUser?.email) {
        throw new Error("Password update is available after signing in again.");
      }

      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
    },
    onSuccess: () => {
      toast.success("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to update password"),
  });

  return (
    <div className="portal-page">
      <div className="page-title-row">
        <div>
          <span>Profile</span>
          <h2>Account and role details</h2>
          <p>Core identity data is read-only for demo users.</p>
        </div>
      </div>
      <div className="profile-grid">
        <PortalCard className="profile-card">
          <div className="avatar avatar-xl">{user.initials}</div>
          <h3>{user.name}</h3>
          <p>{user.email}</p>
          <span className="role-pill">{user.role}</span>
        </PortalCard>
        <PortalCard>
          <h3>Workspace details</h3>
          <div className="profile-detail-grid">
            <label className="form-field"><span>Name</span><input value={name} onChange={(event) => setName(event.target.value)} /></label>
            <label className="form-field"><span>Email</span><input defaultValue={user.email ?? ""} readOnly /></label>
            <label className="form-field"><span>Department</span><input value={department} onChange={(event) => setDepartment(event.target.value)} /></label>
            <label className="form-field"><span>Designation</span><input value={designation} onChange={(event) => setDesignation(event.target.value)} /></label>
            <label className="form-field"><span>Manager</span><input defaultValue={user.manager} readOnly /></label>
            <label className="form-field"><span>Role</span><input defaultValue={user.role} readOnly /></label>
          </div>
          <Button disabled={saveProfile.isPending || name.trim().length < 2} onClick={() => saveProfile.mutate()}>
            <Save size={16} />
            {saveProfile.isPending ? "Saving..." : "Save Profile"}
          </Button>
        </PortalCard>
        <PortalCard>
          <div className="card-title-row">
            <h3>Change Password</h3>
            <KeyRound size={21} />
          </div>
          <div className="profile-detail-grid">
            <label className="form-field"><span>Current password</span><input autoComplete="current-password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
            <label className="form-field"><span>New password</span><input autoComplete="new-password" minLength={8} type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
            <label className="form-field"><span>Confirm new password</span><input autoComplete="new-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
          </div>
          <Button disabled={!passwordReady || changePassword.isPending} variant="secondary" onClick={() => changePassword.mutate()}>
            {changePassword.isPending ? "Updating..." : "Update Password"}
          </Button>
        </PortalCard>
      </div>
    </div>
  );
}
