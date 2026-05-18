import type { PortalSession } from "@/lib/auth-types";

export type PortalRole = "employee" | "manager" | "admin";
export type SheetStatus = "draft" | "submitted" | "returned" | "approved" | "locked";
export type Quarter = "Q1" | "Q2" | "Q3" | "Q4";
export type UpdateStatus = "not_started" | "on_track" | "completed";
export type UomType =
  | "min_numeric"
  | "min_percent"
  | "max_numeric"
  | "max_percent"
  | "timeline"
  | "zero";

export type PortalGoal = {
  id: string;
  thrustArea: string;
  color: string;
  title: string;
  description: string;
  uomType: UomType;
  target: string;
  weightage: number;
  status: SheetStatus;
  isLocked: boolean;
  isShared: boolean;
  score: number | null;
  updates: Record<Quarter, { actual: string; score: number | null; status: UpdateStatus }>;
};

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  initials: string;
  department: string;
  designation: string;
  manager: string;
  status: SheetStatus;
  goals: PortalGoal[];
  quarters: Record<Quarter, boolean>;
};

export type AuditEntry = {
  id: string;
  action: string;
  actor: string;
  entity: string;
  timestamp: string;
  summary: string;
  before: string;
  after: string;
  tone: "info" | "warning" | "success" | "danger";
};

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  type: "approval" | "checkin" | "system" | "shared";
};

export const quarters: Quarter[] = ["Q1", "Q2", "Q3", "Q4"];

function initialsFor(name?: string | null) {
  return (
    name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "AQ"
  );
}

export function getPortalUser(session: PortalSession | null | undefined) {
  const role = (session?.user.role ?? "employee") as PortalRole;

  return {
    name: session?.user.name ?? "AtomQuest User",
    email: session?.user.email ?? "",
    role,
    department: session?.user.department ?? "Unassigned",
    manager: "Assigned manager",
    designation:
      session?.user.designation ??
      (role === "admin" ? "Administrator" : role === "manager" ? "Manager" : "Employee"),
    initials: initialsFor(session?.user.name),
  };
}

export function statusLabel(status: SheetStatus | UpdateStatus) {
  const labels: Record<string, string> = {
    draft: "Draft",
    submitted: "Pending Approval",
    returned: "Returned for Rework",
    approved: "Approved",
    locked: "Locked",
    not_started: "Not Started",
    on_track: "On Track",
    completed: "Completed",
  };
  return labels[status] ?? status;
}

export function uomLabel(type: UomType) {
  const labels: Record<UomType, string> = {
    min_numeric: "Min Numeric",
    min_percent: "Min %",
    max_numeric: "Max Numeric",
    max_percent: "Max %",
    timeline: "Timeline",
    zero: "Zero",
  };
  return labels[type];
}

export function scoreTone(score: number | null) {
  if (score === null) return "muted";
  if (score >= 90) return "success";
  if (score >= 50) return "warning";
  return "danger";
}

export function getGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
