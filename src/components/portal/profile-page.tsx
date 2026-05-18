"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { getPortalUser } from "@/lib/portal-data";
import { Button } from "@/components/ui/button";
import { PortalCard } from "@/components/portal/portal-ui";
import type { PortalSession } from "@/lib/auth-types";
import { apiJson, jsonRequest } from "@/lib/api/client";

export function ProfilePage({ session }: { session: PortalSession | null }) {
  const router = useRouter();
  const user = getPortalUser(session);
  const [name, setName] = useState(user.name);
  const [department, setDepartment] = useState(user.department);
  const [designation, setDesignation] = useState(user.designation);

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

  return (
    <div className="portal-page">
      <div className="page-title-row">
        <div>
          <span>Profile</span>
          <h2>Account and role details</h2>
          <p>Workspace identity for the open-access portal.</p>
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
      </div>
    </div>
  );
}
