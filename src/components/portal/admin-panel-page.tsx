"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Palette, Shield, Users, type LucideIcon } from "lucide-react";
import { teamMembers, thrustAreas } from "@/lib/portal-data";
import { Button } from "@/components/ui/button";
import { PortalCard, StatusBadge } from "@/components/portal/portal-ui";

const tabs = ["Goal Cycles", "Thrust Areas", "User Management", "Escalation Rules"];

const escalationRules: Array<{ trigger: string; threshold: string; Icon: LucideIcon }> = [
  { trigger: "goal_not_submitted", threshold: "7 days after goal setting opens", Icon: Users },
  { trigger: "approval_pending", threshold: "3 days after submission", Icon: Shield },
  { trigger: "checkin_overdue", threshold: "5 days after quarter opens", Icon: Palette },
];

export function AdminPanelPage() {
  const [activeTab, setActiveTab] = useState(tabs[0]);

  return (
    <div className="portal-page">
      <div className="page-title-row">
        <div>
          <span>Admin / HR</span>
          <h2>Configuration console</h2>
          <p>Manage cycles, thrust areas, org hierarchy, and escalation thresholds.</p>
        </div>
      </div>

      <div className="portal-tabs" role="tablist">
        {tabs.map((tab) => (
          <button className={activeTab === tab ? "is-active" : ""} key={tab} onClick={() => setActiveTab(tab)} type="button">
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Goal Cycles" ? (
        <div className="admin-grid">
          <PortalCard>
            <CalendarDays size={24} />
            <h3>FY 2025-26</h3>
            <p>Active annual goal cycle controlling goal setting and quarterly windows.</p>
            <StatusBadge status="approved" />
          </PortalCard>
          <PortalCard>
            <h3>Create or edit cycle</h3>
            <div className="admin-form-grid">
              <label className="form-field"><span>Name</span><input defaultValue="FY 2025-26" /></label>
              <label className="form-field"><span>Goal setting opens</span><input defaultValue="2025-05-01" type="date" /></label>
              <label className="form-field"><span>Q1 opens</span><input defaultValue="2025-07-01" type="date" /></label>
              <label className="form-field"><span>Q2 opens</span><input defaultValue="2025-10-01" type="date" /></label>
              <label className="form-field"><span>Q3 opens</span><input defaultValue="2026-01-01" type="date" /></label>
              <label className="form-field"><span>Q4 opens</span><input defaultValue="2026-03-01" type="date" /></label>
            </div>
            <Button onClick={() => toast.success("Cycle settings saved.")}>Save Cycle</Button>
          </PortalCard>
        </div>
      ) : null}

      {activeTab === "Thrust Areas" ? (
        <div className="portal-table-wrap">
          <table className="portal-table">
            <thead><tr><th>Name</th><th>Color</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {thrustAreas.map((area) => (
                <tr key={area.id}>
                  <td><strong>{area.name}</strong></td>
                  <td><span className="color-swatch" style={{ background: area.color }} />{area.color}</td>
                  <td>Active</td>
                  <td><button>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {activeTab === "User Management" ? (
        <div className="portal-table-wrap">
          <table className="portal-table">
            <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Department</th><th>Manager</th><th>Action</th></tr></thead>
            <tbody>
              {teamMembers.map((member) => (
                <tr key={member.id}>
                  <td><span className="avatar">{member.initials}</span><strong>{member.name}</strong></td>
                  <td>{member.email}</td>
                  <td>employee</td>
                  <td>{member.department}</td>
                  <td>{member.manager}</td>
                  <td><button>Change role</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {activeTab === "Escalation Rules" ? (
        <div className="admin-grid">
          {escalationRules.map(({ trigger, threshold, Icon }) => (
            <PortalCard key={trigger}>
              <Icon size={24} />
              <h3>{trigger}</h3>
              <p>{threshold}</p>
              <label className="toggle-row"><input defaultChecked type="checkbox" /><span>Notify employee and manager</span></label>
            </PortalCard>
          ))}
        </div>
      ) : null}
    </div>
  );
}
