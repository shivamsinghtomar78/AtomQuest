"use client";

import Link from "next/link";
import { teamMembers } from "@/lib/portal-data";
import { PortalCard, StatusBadge } from "@/components/portal/portal-ui";

export function EmployeesPage() {
  return (
    <div className="portal-page">
      <div className="page-title-row">
        <div>
          <span>All Employees</span>
          <h2>Organization hierarchy</h2>
          <p>Admin-ready view of employees, managers, departments, and sheet status.</p>
        </div>
      </div>
      <div className="employee-grid">
        {teamMembers.map((member) => (
          <PortalCard key={member.id}>
            <div className="employee-card-head">
              <div className="avatar">{member.initials}</div>
              <div>
                <h3>{member.name}</h3>
                <p>{member.email}</p>
              </div>
            </div>
            <dl className="employee-detail-list">
              <div><dt>Department</dt><dd>{member.department}</dd></div>
              <div><dt>Designation</dt><dd>{member.designation}</dd></div>
              <div><dt>Manager</dt><dd>{member.manager}</dd></div>
              <div><dt>Status</dt><dd><StatusBadge status={member.status} /></dd></div>
            </dl>
            <Link className="employee-card-link" href={`/app/team-goals/${member.id}/review`}>
              Review goal sheet
            </Link>
          </PortalCard>
        ))}
      </div>
    </div>
  );
}
