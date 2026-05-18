"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { EmptyState, PortalCard, SkeletonBlock, StatusBadge } from "@/components/portal/portal-ui";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: "employee" | "manager" | "admin";
  department: string | null;
  designation: string | null;
  managerId: string | null;
};

async function fetchUsers() {
  const response = await fetch("/api/admin/users?limit=100");
  const payload = await response.json();
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message ?? "Unable to load users");
  }
  return (payload.data?.items ?? []) as UserRow[];
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function EmployeesPage() {
  const query = useQuery({ queryKey: ["admin", "users"], queryFn: fetchUsers });
  const users = query.data ?? [];

  return (
    <div className="portal-page">
      <div className="page-title-row">
        <div>
          <span>All Employees</span>
          <h2>Organization hierarchy</h2>
          <p>Admin-ready view of employees, managers, departments, and sheet status.</p>
        </div>
      </div>
      {query.isLoading ? (
        <SkeletonBlock />
      ) : users.length ? (
        <div className="employee-grid">
          {users.map((member) => (
            <PortalCard key={member.id}>
              <div className="employee-card-head">
                <div className="avatar">{initials(member.name)}</div>
                <div>
                  <h3>{member.name}</h3>
                  <p>{member.email}</p>
                </div>
              </div>
              <dl className="employee-detail-list">
                <div><dt>Department</dt><dd>{member.department}</dd></div>
                <div><dt>Designation</dt><dd>{member.designation}</dd></div>
                <div><dt>Role</dt><dd><StatusBadge status={member.role === "admin" ? "locked" : member.role === "manager" ? "approved" : "draft"} /></dd></div>
              </dl>
              {member.role === "employee" ? (
                <Link className="employee-card-link" href="/team-goals">
                  Review goal sheet
                </Link>
              ) : null}
            </PortalCard>
          ))}
        </div>
      ) : (
        <EmptyState
          description="Create seed users or add users from the admin panel."
          title="No users found"
        />
      )}
    </div>
  );
}
