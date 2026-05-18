"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarDays, Palette, Shield, Users, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalCard, StatusBadge } from "@/components/portal/portal-ui";

const tabs = ["Goal Cycles", "Thrust Areas", "User Management", "Escalation Rules"];
const tabAliases: Record<string, string> = {
  cycles: "Goal Cycles",
  "thrust-areas": "Thrust Areas",
  users: "User Management",
};

const escalationRules: Array<{ trigger: string; threshold: string; Icon: LucideIcon }> = [
  { trigger: "goal_not_submitted", threshold: "7 days after goal setting opens", Icon: Users },
  { trigger: "approval_pending", threshold: "3 days after submission", Icon: Shield },
  { trigger: "checkin_overdue", threshold: "5 days after quarter opens", Icon: Palette },
];

type ThrustArea = { id: string; name: string; colorHex: string; isActive: boolean };
type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "employee" | "manager" | "admin";
  department: string | null;
};
type Cycle = {
  name: string;
  goalSettingOpens: string;
  q1Opens: string;
  q2Opens: string;
  q3Opens: string;
  q4Opens: string;
};

async function fetchJson<T>(url: string) {
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message ?? "Unable to load data");
  }
  return payload.data as T;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AdminPanelPage({ initialTab }: { initialTab?: string }) {
  const [activeTab, setActiveTab] = useState(tabAliases[initialTab ?? ""] ?? tabs[0]);
  const cycleQuery = useQuery({ queryKey: ["cycles", "active"], queryFn: () => fetchJson<Cycle>("/api/cycles/active") });
  const thrustAreasQuery = useQuery({ queryKey: ["thrust-areas"], queryFn: () => fetchJson<ThrustArea[]>("/api/thrust-areas") });
  const usersQuery = useQuery({ queryKey: ["admin", "users"], queryFn: () => fetchJson<{ items: UserRow[] }>("/api/admin/users?limit=100") });
  const cycle = cycleQuery.data;
  const thrustAreas = thrustAreasQuery.data ?? [];
  const users = usersQuery.data?.items ?? [];

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
            <h3>{cycle?.name ?? "FY 2025-26"}</h3>
            <p>Active annual goal cycle controlling goal setting and quarterly windows.</p>
            <StatusBadge status="approved" />
          </PortalCard>
          <PortalCard>
            <h3>Create or edit cycle</h3>
            <div className="admin-form-grid">
              <label className="form-field"><span>Name</span><input defaultValue={cycle?.name ?? "FY 2025-26"} /></label>
              <label className="form-field"><span>Goal setting opens</span><input defaultValue={cycle?.goalSettingOpens?.slice(0, 10) ?? "2025-05-01"} type="date" /></label>
              <label className="form-field"><span>Q1 opens</span><input defaultValue={cycle?.q1Opens?.slice(0, 10) ?? "2025-07-01"} type="date" /></label>
              <label className="form-field"><span>Q2 opens</span><input defaultValue={cycle?.q2Opens?.slice(0, 10) ?? "2025-10-01"} type="date" /></label>
              <label className="form-field"><span>Q3 opens</span><input defaultValue={cycle?.q3Opens?.slice(0, 10) ?? "2026-01-01"} type="date" /></label>
              <label className="form-field"><span>Q4 opens</span><input defaultValue={cycle?.q4Opens?.slice(0, 10) ?? "2026-03-01"} type="date" /></label>
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
                  <td><span className="color-swatch" style={{ background: area.colorHex }} />{area.colorHex}</td>
                  <td>{area.isActive ? "Active" : "Inactive"}</td>
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
              {users.map((member) => (
                <tr key={member.id}>
                  <td><span className="avatar">{initials(member.name)}</span><strong>{member.name}</strong></td>
                  <td>{member.email}</td>
                  <td>{member.role}</td>
                  <td>{member.department}</td>
                  <td>{member.role === "employee" ? "Assigned" : "-"}</td>
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
