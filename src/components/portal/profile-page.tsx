"use client";

import { toast } from "sonner";
import { KeyRound, Save } from "lucide-react";
import { getPortalUser } from "@/lib/portal-data";
import { Button } from "@/components/ui/button";
import { PortalCard } from "@/components/portal/portal-ui";
import type { PortalSession } from "@/lib/auth-types";

export function ProfilePage({ session }: { session: PortalSession | null }) {
  const user = getPortalUser(session);

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
            <label className="form-field"><span>Name</span><input defaultValue={user.name} /></label>
            <label className="form-field"><span>Email</span><input defaultValue={user.email ?? ""} readOnly /></label>
            <label className="form-field"><span>Department</span><input defaultValue={user.department} /></label>
            <label className="form-field"><span>Designation</span><input defaultValue={user.designation} /></label>
            <label className="form-field"><span>Manager</span><input defaultValue={user.manager} readOnly /></label>
            <label className="form-field"><span>Role</span><input defaultValue={user.role} readOnly /></label>
          </div>
          <Button onClick={() => toast.success("Profile preferences saved.")}>
            <Save size={16} />
            Save Profile
          </Button>
        </PortalCard>
        <PortalCard>
          <div className="card-title-row">
            <h3>Change Password</h3>
            <KeyRound size={21} />
          </div>
          <div className="profile-detail-grid">
            <label className="form-field"><span>Current password</span><input type="password" /></label>
            <label className="form-field"><span>New password</span><input type="password" /></label>
            <label className="form-field"><span>Confirm new password</span><input type="password" /></label>
          </div>
          <Button variant="secondary" onClick={() => toast.info("Password change flow stubbed for the hackathon demo.")}>
            Update Password
          </Button>
        </PortalCard>
      </div>
    </div>
  );
}
