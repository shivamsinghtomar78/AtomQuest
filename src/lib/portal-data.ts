import type { Session } from "next-auth";

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

export const thrustAreas = [
  { id: "revenue", name: "Revenue Growth", color: "#2563EB" },
  { id: "customer", name: "Customer Satisfaction", color: "#22C55E" },
  { id: "ops", name: "Operational Excellence", color: "#F59E0B" },
  { id: "people", name: "People Development", color: "#8B5CF6" },
  { id: "innovation", name: "Innovation", color: "#06B6D4" },
  { id: "cost", name: "Cost Optimization", color: "#EF4444" },
  { id: "safety", name: "Safety & Compliance", color: "#0F766E" },
];

export const demoGoals: PortalGoal[] = [
  {
    id: "goal-revenue",
    thrustArea: "Revenue Growth",
    color: "#2563EB",
    title: "Improve enterprise renewal revenue",
    description: "Increase quarterly renewal revenue from strategic accounts through structured account plans.",
    uomType: "min_numeric",
    target: "₹45L",
    weightage: 25,
    status: "approved",
    isLocked: true,
    isShared: false,
    score: 108,
    updates: {
      Q1: { actual: "₹12L", score: 96, status: "completed" },
      Q2: { actual: "₹15L", score: 112, status: "on_track" },
      Q3: { actual: "Pending", score: null, status: "not_started" },
      Q4: { actual: "Pending", score: null, status: "not_started" },
    },
  },
  {
    id: "goal-nps",
    thrustArea: "Customer Satisfaction",
    color: "#22C55E",
    title: "Raise customer satisfaction score",
    description: "Move support CSAT to 92% with faster first response and tighter incident follow-up.",
    uomType: "min_percent",
    target: "92%",
    weightage: 20,
    status: "approved",
    isLocked: true,
    isShared: false,
    score: 91,
    updates: {
      Q1: { actual: "88%", score: 96, status: "completed" },
      Q2: { actual: "91%", score: 99, status: "on_track" },
      Q3: { actual: "Pending", score: null, status: "not_started" },
      Q4: { actual: "Pending", score: null, status: "not_started" },
    },
  },
  {
    id: "goal-tat",
    thrustArea: "Operational Excellence",
    color: "#F59E0B",
    title: "Reduce approval turnaround time",
    description: "Bring average goal approval TAT below 3 business days through checklist-driven reviews.",
    uomType: "max_numeric",
    target: "3 days",
    weightage: 15,
    status: "approved",
    isLocked: true,
    isShared: true,
    score: 120,
    updates: {
      Q1: { actual: "3.8 days", score: 79, status: "completed" },
      Q2: { actual: "2.5 days", score: 120, status: "completed" },
      Q3: { actual: "Pending", score: null, status: "not_started" },
      Q4: { actual: "Pending", score: null, status: "not_started" },
    },
  },
  {
    id: "goal-people",
    thrustArea: "People Development",
    color: "#8B5CF6",
    title: "Complete manager coaching rituals",
    description: "Conduct structured monthly coaching conversations and document support needed by team members.",
    uomType: "timeline",
    target: "2026-03-31",
    weightage: 20,
    status: "draft",
    isLocked: false,
    isShared: false,
    score: null,
    updates: {
      Q1: { actual: "2025-08-28", score: 100, status: "completed" },
      Q2: { actual: "Pending", score: null, status: "not_started" },
      Q3: { actual: "Pending", score: null, status: "not_started" },
      Q4: { actual: "Pending", score: null, status: "not_started" },
    },
  },
  {
    id: "goal-safety",
    thrustArea: "Safety & Compliance",
    color: "#0F766E",
    title: "Maintain zero critical compliance incidents",
    description: "Track critical incidents and keep quarterly incident count at zero.",
    uomType: "zero",
    target: "0 incidents",
    weightage: 20,
    status: "draft",
    isLocked: false,
    isShared: false,
    score: 100,
    updates: {
      Q1: { actual: "0", score: 100, status: "completed" },
      Q2: { actual: "0", score: 100, status: "on_track" },
      Q3: { actual: "Pending", score: null, status: "not_started" },
      Q4: { actual: "Pending", score: null, status: "not_started" },
    },
  },
];

export const teamMembers: TeamMember[] = [
  {
    id: "emp-priya",
    name: "Priya Sharma",
    email: "emp1@atomquest.com",
    initials: "PS",
    department: "Operations",
    designation: "Senior Associate",
    manager: "Rajesh Kumar",
    status: "submitted",
    goals: demoGoals.slice(0, 4),
    quarters: { Q1: true, Q2: true, Q3: false, Q4: false },
  },
  {
    id: "emp-amit",
    name: "Amit Verma",
    email: "emp2@atomquest.com",
    initials: "AV",
    department: "Operations",
    designation: "Business Analyst",
    manager: "Rajesh Kumar",
    status: "approved",
    goals: demoGoals.slice(1, 5),
    quarters: { Q1: true, Q2: false, Q3: false, Q4: false },
  },
  {
    id: "emp-neha",
    name: "Neha Iyer",
    email: "neha@atomquest.com",
    initials: "NI",
    department: "Customer Success",
    designation: "CS Lead",
    manager: "Rajesh Kumar",
    status: "locked",
    goals: demoGoals.slice(0, 3),
    quarters: { Q1: true, Q2: true, Q3: true, Q4: false },
  },
  {
    id: "emp-farhan",
    name: "Farhan Ali",
    email: "farhan@atomquest.com",
    initials: "FA",
    department: "Finance",
    designation: "Finance Partner",
    manager: "Rajesh Kumar",
    status: "draft",
    goals: demoGoals.slice(2, 5),
    quarters: { Q1: false, Q2: false, Q3: false, Q4: false },
  },
];

export const notifications: NotificationItem[] = [
  {
    id: "notif-approval",
    title: "Priya submitted goals",
    body: "Goal sheet is ready for L1 review.",
    time: "10 min ago",
    unread: true,
    type: "approval",
  },
  {
    id: "notif-checkin",
    title: "Q2 check-in pending",
    body: "Amit Verma has not completed Q2 actuals.",
    time: "1 hr ago",
    unread: true,
    type: "checkin",
  },
  {
    id: "notif-shared",
    title: "Shared goal synced",
    body: "Operational TAT achievement copied to linked goal sheets.",
    time: "Yesterday",
    unread: false,
    type: "shared",
  },
];

export const auditEntries: AuditEntry[] = [
  {
    id: "audit-1",
    action: "weightage_changed",
    actor: "Rajesh Kumar",
    entity: "Priya Sharma goal sheet",
    timestamp: "2026-01-15 14:32:07 IST",
    summary: "Revenue Growth weightage changed during manager approval.",
    before: "20%",
    after: "25%",
    tone: "warning",
  },
  {
    id: "audit-2",
    action: "goal_unlocked",
    actor: "Admin HR",
    entity: "Amit Verma goal sheet",
    timestamp: "2026-01-12 09:18:44 IST",
    summary: "Admin unlocked sheet for target correction with written reason.",
    before: "locked",
    after: "approved",
    tone: "info",
  },
  {
    id: "audit-3",
    action: "status_changed",
    actor: "Rajesh Kumar",
    entity: "Neha Iyer goal sheet",
    timestamp: "2026-01-09 17:02:21 IST",
    summary: "Manager approved sheet and locked all goals.",
    before: "submitted",
    after: "locked",
    tone: "success",
  },
];

export function getPortalUser(session: Session | null | undefined) {
  return {
    name: session?.user.name ?? "Priya Sharma",
    email: session?.user.email ?? "emp1@atomquest.com",
    role: (session?.user.role ?? "employee") as PortalRole,
    department: session?.user.department ?? "Operations",
    manager: "Rajesh Kumar",
    designation:
      session?.user.role === "admin"
        ? "HR Administrator"
        : session?.user.role === "manager"
          ? "L1 Manager"
          : "Senior Associate",
    initials:
      session?.user.name
        ?.split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() ?? "PS",
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
  if (score >= 80) return "success";
  if (score >= 50) return "warning";
  return "danger";
}

export function getGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function getWeightageUsed(goals = demoGoals) {
  return goals.reduce((total, goal) => total + goal.weightage, 0);
}

export function getAverageQuarterScore(quarter: Quarter, goals = demoGoals) {
  const scores = goals
    .map((goal) => goal.updates[quarter]?.score)
    .filter((score): score is number => typeof score === "number");
  if (!scores.length) return null;
  return Math.round(scores.reduce((total, score) => total + score, 0) / scores.length);
}

export function getMemberById(id: string) {
  return teamMembers.find((member) => member.id === id) ?? teamMembers[0];
}
