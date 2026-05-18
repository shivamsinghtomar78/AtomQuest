"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarDays, Edit3, Palette, Plus, Save, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataToolbar, EmptyState, PortalCard, StatusBadge } from "@/components/portal/portal-ui";
import { apiJson, jsonRequest } from "@/lib/api/client";

const tabs = ["Goal Cycles", "Thrust Areas", "User Management", "Escalation Rules"];
const tabAliases: Record<string, string> = {
  cycles: "Goal Cycles",
  "thrust-areas": "Thrust Areas",
  users: "User Management",
};

type Role = "employee" | "manager" | "admin";
type ThrustArea = { id: string; name: string; description: string | null; colorHex: string; isActive: boolean };
type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string | null;
  designation: string | null;
  managerId: string | null;
  employeeCode: string | null;
  isActive: boolean;
};
type Cycle = {
  id: string;
  name: string;
  goalSettingOpens: string;
  q1Opens: string;
  q2Opens: string;
  q3Opens: string;
  q4Opens: string;
  isActive: boolean;
};
type EscalationRule = {
  id: string;
  cycleId: string | null;
  triggerEvent: string;
  daysThreshold: number;
  notifyEmployee: boolean;
  notifyManager: boolean;
  notifyAdmin: boolean;
  isActive: boolean;
  cycle?: { id: string; name: string; isActive: boolean } | null;
};

const emptyCycleForm = {
  name: "FY 2025-26",
  goalSettingOpens: "",
  q1Opens: "",
  q2Opens: "",
  q3Opens: "",
  q4Opens: "",
  isActive: true,
};

const emptyUserForm = {
  name: "",
  email: "",
  role: "employee" as Role,
  department: "",
  designation: "",
  managerId: "",
  employeeCode: "",
};

const emptyRuleForm = {
  triggerEvent: "goal_not_submitted",
  daysThreshold: 7,
  notifyEmployee: true,
  notifyManager: true,
  notifyAdmin: false,
  isActive: true,
  cycleId: "",
};

async function fetchCycles() {
  return apiJson<Cycle[]>("/api/admin/cycles");
}

async function fetchThrustAreas() {
  return apiJson<ThrustArea[]>("/api/admin/thrust-areas");
}

async function fetchUsers() {
  const payload = await apiJson<{ items: UserRow[] }>("/api/admin/users?limit=100");
  return payload.items ?? [];
}

async function fetchEscalationRules() {
  return apiJson<EscalationRule[]>("/api/admin/escalation-rules");
}

function dateInput(value?: string | null) {
  return value?.slice(0, 10) ?? "";
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
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(tabAliases[initialTab ?? ""] ?? tabs[0]);
  const [cycleForm, setCycleForm] = useState(emptyCycleForm);
  const [thrustForm, setThrustForm] = useState({ id: "", name: "", description: "", colorHex: "#2563EB", isActive: true });
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [ruleForm, setRuleForm] = useState(emptyRuleForm);

  const cyclesQuery = useQuery({ queryKey: ["admin", "cycles"], queryFn: fetchCycles });
  const thrustAreasQuery = useQuery({ queryKey: ["admin", "thrust-areas"], queryFn: fetchThrustAreas });
  const usersQuery = useQuery({ queryKey: ["admin", "users"], queryFn: fetchUsers });
  const rulesQuery = useQuery({ queryKey: ["admin", "escalation-rules"], queryFn: fetchEscalationRules });

  const cycles = cyclesQuery.data ?? [];
  const activeCycle = cycles.find((cycle) => cycle.isActive) ?? cycles[0];
  const thrustAreas = thrustAreasQuery.data ?? [];
  const users = usersQuery.data ?? [];
  const managers = users.filter((user) => user.role === "manager" || user.role === "admin");
  const rules = rulesQuery.data ?? [];

  useEffect(() => {
    if (!activeCycle) return;
    setCycleForm({
      name: activeCycle.name,
      goalSettingOpens: dateInput(activeCycle.goalSettingOpens),
      q1Opens: dateInput(activeCycle.q1Opens),
      q2Opens: dateInput(activeCycle.q2Opens),
      q3Opens: dateInput(activeCycle.q3Opens),
      q4Opens: dateInput(activeCycle.q4Opens),
      isActive: activeCycle.isActive,
    });
    setRuleForm((current) => ({ ...current, cycleId: activeCycle.id }));
  }, [activeCycle?.id]);

  const saveCycle = useMutation({
    mutationFn: () => {
      const body = {
        name: cycleForm.name,
        goal_setting_opens: cycleForm.goalSettingOpens,
        q1_opens: cycleForm.q1Opens,
        q2_opens: cycleForm.q2Opens,
        q3_opens: cycleForm.q3Opens,
        q4_opens: cycleForm.q4Opens,
        is_active: cycleForm.isActive,
      };
      return activeCycle
        ? apiJson<Cycle>(`/api/admin/cycles/${activeCycle.id}`, jsonRequest("PATCH", body))
        : apiJson<Cycle>("/api/admin/cycles", jsonRequest("POST", body));
    },
    onSuccess: () => {
      toast.success("Cycle settings saved");
      queryClient.invalidateQueries({ queryKey: ["admin", "cycles"] });
      queryClient.invalidateQueries({ queryKey: ["cycles", "active"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to save cycle"),
  });

  const saveThrustArea = useMutation({
    mutationFn: () =>
      apiJson<ThrustArea>(
        "/api/admin/thrust-areas",
        jsonRequest(thrustForm.id ? "PATCH" : "POST", {
          ...(thrustForm.id ? { id: thrustForm.id } : {}),
          name: thrustForm.name,
          description: thrustForm.description,
          color_hex: thrustForm.colorHex,
          ...(thrustForm.id ? { is_active: thrustForm.isActive } : {}),
        })
      ),
    onSuccess: () => {
      toast.success(thrustForm.id ? "Thrust area updated" : "Thrust area created");
      setThrustForm({ id: "", name: "", description: "", colorHex: "#2563EB", isActive: true });
      queryClient.invalidateQueries({ queryKey: ["admin", "thrust-areas"] });
      queryClient.invalidateQueries({ queryKey: ["thrust-areas"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to save thrust area"),
  });

  const createUser = useMutation({
    mutationFn: () =>
      apiJson<UserRow>("/api/admin/users", jsonRequest("POST", {
        email: userForm.email,
        name: userForm.name,
        role: userForm.role,
        department: userForm.department || null,
        designation: userForm.designation || null,
        manager_id: userForm.managerId || null,
        employee_code: userForm.employeeCode || null,
      })),
    onSuccess: () => {
      toast.success("User created");
      setUserForm(emptyUserForm);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to create user"),
  });

  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) =>
      apiJson<UserRow>(`/api/admin/users/${id}/role`, jsonRequest("PATCH", {
        role,
        reason: "Admin role update",
      })),
    onSuccess: () => {
      toast.success("Role updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to update role"),
  });

  const createRule = useMutation({
    mutationFn: () =>
      apiJson<EscalationRule>("/api/admin/escalation-rules", jsonRequest("POST", {
        cycle_id: ruleForm.cycleId || null,
        trigger_event: ruleForm.triggerEvent,
        days_threshold: ruleForm.daysThreshold,
        notify_employee: ruleForm.notifyEmployee,
        notify_manager: ruleForm.notifyManager,
        notify_admin: ruleForm.notifyAdmin,
        is_active: ruleForm.isActive,
      })),
    onSuccess: () => {
      toast.success("Escalation rule created");
      setRuleForm({ ...emptyRuleForm, cycleId: activeCycle?.id ?? "" });
      queryClient.invalidateQueries({ queryKey: ["admin", "escalation-rules"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to create rule"),
  });

  const updateRule = useMutation({
    mutationFn: (rule: EscalationRule) =>
      apiJson<EscalationRule>("/api/admin/escalation-rules", jsonRequest("PATCH", {
        id: rule.id,
        cycle_id: rule.cycleId,
        trigger_event: rule.triggerEvent,
        days_threshold: rule.daysThreshold,
        notify_employee: rule.notifyEmployee,
        notify_manager: rule.notifyManager,
        notify_admin: rule.notifyAdmin,
        is_active: rule.isActive,
      })),
    onSuccess: () => {
      toast.success("Escalation rule updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "escalation-rules"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to update rule"),
  });

  const userReady = useMemo(
    () => userForm.name.trim().length >= 2 && userForm.email.includes("@"),
    [userForm]
  );

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
            <h3>{activeCycle?.name ?? "No active cycle"}</h3>
            <p>Active annual goal cycle controlling goal setting and quarterly windows.</p>
            <StatusBadge status="approved" />
          </PortalCard>
          <PortalCard className="admin-wide-card">
            <h3>Create or edit cycle</h3>
            <div className="admin-form-grid">
              <label className="form-field"><span>Name</span><input value={cycleForm.name} onChange={(event) => setCycleForm({ ...cycleForm, name: event.target.value })} /></label>
              <label className="form-field"><span>Goal setting opens</span><input value={cycleForm.goalSettingOpens} onChange={(event) => setCycleForm({ ...cycleForm, goalSettingOpens: event.target.value })} type="date" /></label>
              <label className="form-field"><span>Q1 opens</span><input value={cycleForm.q1Opens} onChange={(event) => setCycleForm({ ...cycleForm, q1Opens: event.target.value })} type="date" /></label>
              <label className="form-field"><span>Q2 opens</span><input value={cycleForm.q2Opens} onChange={(event) => setCycleForm({ ...cycleForm, q2Opens: event.target.value })} type="date" /></label>
              <label className="form-field"><span>Q3 opens</span><input value={cycleForm.q3Opens} onChange={(event) => setCycleForm({ ...cycleForm, q3Opens: event.target.value })} type="date" /></label>
              <label className="form-field"><span>Q4 opens</span><input value={cycleForm.q4Opens} onChange={(event) => setCycleForm({ ...cycleForm, q4Opens: event.target.value })} type="date" /></label>
            </div>
            <label className="toggle-row"><input checked={cycleForm.isActive} onChange={(event) => setCycleForm({ ...cycleForm, isActive: event.target.checked })} type="checkbox" /><span>Set as active cycle</span></label>
            <Button disabled={saveCycle.isPending} onClick={() => saveCycle.mutate()}><Save size={16} />{saveCycle.isPending ? "Saving..." : "Save Cycle"}</Button>
          </PortalCard>
        </div>
      ) : null}

      {activeTab === "Thrust Areas" ? (
        <>
          <PortalCard>
            <h3>{thrustForm.id ? "Edit thrust area" : "Create thrust area"}</h3>
            <div className="admin-form-grid">
              <label className="form-field"><span>Name</span><input value={thrustForm.name} onChange={(event) => setThrustForm({ ...thrustForm, name: event.target.value })} /></label>
              <label className="form-field"><span>Color</span><input value={thrustForm.colorHex} onChange={(event) => setThrustForm({ ...thrustForm, colorHex: event.target.value })} type="color" /></label>
              <label className="form-field"><span>Description</span><input value={thrustForm.description} onChange={(event) => setThrustForm({ ...thrustForm, description: event.target.value })} /></label>
              <label className="toggle-row"><input checked={thrustForm.isActive} onChange={(event) => setThrustForm({ ...thrustForm, isActive: event.target.checked })} type="checkbox" /><span>Active</span></label>
            </div>
            <Button disabled={saveThrustArea.isPending || thrustForm.name.trim().length < 2} onClick={() => saveThrustArea.mutate()}>
              <Palette size={16} />{saveThrustArea.isPending ? "Saving..." : thrustForm.id ? "Update Thrust Area" : "Create Thrust Area"}
            </Button>
          </PortalCard>
          <div className="portal-table-wrap">
            <table className="portal-table">
              <thead><tr><th>Name</th><th>Color</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {thrustAreas.map((area) => (
                  <tr key={area.id}>
                    <td><strong>{area.name}</strong><small>{area.description}</small></td>
                    <td><span className="color-swatch" style={{ background: area.colorHex }} />{area.colorHex}</td>
                    <td>{area.isActive ? "Active" : "Inactive"}</td>
                    <td><button onClick={() => setThrustForm({ id: area.id, name: area.name, description: area.description ?? "", colorHex: area.colorHex, isActive: area.isActive })} type="button"><Edit3 size={15} /> Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {activeTab === "User Management" ? (
        <>
          <PortalCard>
            <h3>Create user</h3>
            <div className="admin-form-grid">
              <label className="form-field"><span>Name</span><input value={userForm.name} onChange={(event) => setUserForm({ ...userForm, name: event.target.value })} /></label>
              <label className="form-field"><span>Email</span><input value={userForm.email} onChange={(event) => setUserForm({ ...userForm, email: event.target.value })} type="email" /></label>
              <label className="form-field"><span>Role</span><select value={userForm.role} onChange={(event) => setUserForm({ ...userForm, role: event.target.value as Role })}><option value="employee">Employee</option><option value="manager">Manager</option><option value="admin">Admin</option></select></label>
              <label className="form-field"><span>Department</span><input value={userForm.department} onChange={(event) => setUserForm({ ...userForm, department: event.target.value })} /></label>
              <label className="form-field"><span>Designation</span><input value={userForm.designation} onChange={(event) => setUserForm({ ...userForm, designation: event.target.value })} /></label>
              <label className="form-field"><span>Manager</span><select value={userForm.managerId} onChange={(event) => setUserForm({ ...userForm, managerId: event.target.value })}><option value="">No manager</option>{managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name}</option>)}</select></label>
              <label className="form-field"><span>Employee code</span><input value={userForm.employeeCode} onChange={(event) => setUserForm({ ...userForm, employeeCode: event.target.value })} /></label>
            </div>
            <Button disabled={!userReady || createUser.isPending} onClick={() => createUser.mutate()}><Plus size={16} />{createUser.isPending ? "Creating..." : "Create User"}</Button>
          </PortalCard>
          <DataToolbar>
            <span>{users.length} active users loaded</span>
          </DataToolbar>
          <div className="portal-table-wrap">
            <table className="portal-table">
              <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Department</th><th>Manager</th><th>Status</th></tr></thead>
              <tbody>
                {users.map((member) => (
                  <tr key={member.id}>
                    <td><span className="avatar">{initials(member.name)}</span><strong>{member.name}</strong><small>{member.designation}</small></td>
                    <td>{member.email}</td>
                    <td>
                      <select
                        value={member.role}
                        onChange={(event) => changeRole.mutate({ id: member.id, role: event.target.value as Role })}
                      >
                        <option value="employee">employee</option>
                        <option value="manager">manager</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td>{member.department}</td>
                    <td>{users.find((item) => item.id === member.managerId)?.name ?? "-"}</td>
                    <td>{member.isActive ? "Active" : "Inactive"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {activeTab === "Escalation Rules" ? (
        <>
          <PortalCard>
            <h3>Create escalation rule</h3>
            <div className="admin-form-grid">
              <label className="form-field"><span>Trigger event</span><input value={ruleForm.triggerEvent} onChange={(event) => setRuleForm({ ...ruleForm, triggerEvent: event.target.value })} /></label>
              <label className="form-field"><span>Days threshold</span><input min={1} type="number" value={ruleForm.daysThreshold} onChange={(event) => setRuleForm({ ...ruleForm, daysThreshold: Number(event.target.value) })} /></label>
              <label className="form-field"><span>Cycle</span><select value={ruleForm.cycleId} onChange={(event) => setRuleForm({ ...ruleForm, cycleId: event.target.value })}><option value="">All cycles</option>{cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.name}</option>)}</select></label>
              <label className="toggle-row"><input checked={ruleForm.isActive} onChange={(event) => setRuleForm({ ...ruleForm, isActive: event.target.checked })} type="checkbox" /><span>Active</span></label>
              <label className="toggle-row"><input checked={ruleForm.notifyEmployee} onChange={(event) => setRuleForm({ ...ruleForm, notifyEmployee: event.target.checked })} type="checkbox" /><span>Notify employee</span></label>
              <label className="toggle-row"><input checked={ruleForm.notifyManager} onChange={(event) => setRuleForm({ ...ruleForm, notifyManager: event.target.checked })} type="checkbox" /><span>Notify manager</span></label>
              <label className="toggle-row"><input checked={ruleForm.notifyAdmin} onChange={(event) => setRuleForm({ ...ruleForm, notifyAdmin: event.target.checked })} type="checkbox" /><span>Notify admin</span></label>
            </div>
            <Button disabled={createRule.isPending || ruleForm.triggerEvent.trim().length < 3} onClick={() => createRule.mutate()}><Shield size={16} />{createRule.isPending ? "Creating..." : "Create Rule"}</Button>
          </PortalCard>
          {rules.length ? (
            <div className="admin-grid">
              {rules.map((rule) => (
                <EscalationRuleCard
                  cycles={cycles}
                  key={rule.id}
                  onSave={(next) => updateRule.mutate(next)}
                  rule={rule}
                  saving={updateRule.isPending}
                />
              ))}
            </div>
          ) : (
            <EmptyState title="No escalation rules" description="Create the first rule to start reminder automation." />
          )}
        </>
      ) : null}
    </div>
  );
}

function EscalationRuleCard({
  cycles,
  onSave,
  rule,
  saving,
}: {
  cycles: Cycle[];
  onSave: (rule: EscalationRule) => void;
  rule: EscalationRule;
  saving: boolean;
}) {
  const [draft, setDraft] = useState(rule);

  useEffect(() => {
    setDraft(rule);
  }, [rule]);

  return (
    <PortalCard>
      <Users size={24} />
      <label className="form-field"><span>Trigger event</span><input value={draft.triggerEvent} onChange={(event) => setDraft({ ...draft, triggerEvent: event.target.value })} /></label>
      <label className="form-field"><span>Days threshold</span><input min={1} type="number" value={draft.daysThreshold} onChange={(event) => setDraft({ ...draft, daysThreshold: Number(event.target.value) })} /></label>
      <label className="form-field"><span>Cycle</span><select value={draft.cycleId ?? ""} onChange={(event) => setDraft({ ...draft, cycleId: event.target.value || null })}><option value="">All cycles</option>{cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.name}</option>)}</select></label>
      <label className="toggle-row"><input checked={draft.notifyEmployee} onChange={(event) => setDraft({ ...draft, notifyEmployee: event.target.checked })} type="checkbox" /><span>Notify employee</span></label>
      <label className="toggle-row"><input checked={draft.notifyManager} onChange={(event) => setDraft({ ...draft, notifyManager: event.target.checked })} type="checkbox" /><span>Notify manager</span></label>
      <label className="toggle-row"><input checked={draft.notifyAdmin} onChange={(event) => setDraft({ ...draft, notifyAdmin: event.target.checked })} type="checkbox" /><span>Notify admin</span></label>
      <label className="toggle-row"><input checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} type="checkbox" /><span>Rule active</span></label>
      <Button disabled={saving || draft.triggerEvent.trim().length < 3} onClick={() => onSave(draft)}><Save size={16} />Save Rule</Button>
    </PortalCard>
  );
}
