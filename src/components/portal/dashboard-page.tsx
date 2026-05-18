"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Target,
  Users,
} from "lucide-react";
import { getGreeting, quarters } from "@/lib/portal-data";
import {
  PortalCard,
  ProgressBar,
  ScoreChip,
  SkeletonBlock,
  StatusBadge,
} from "@/components/portal/portal-ui";
import type { PortalSession } from "@/lib/auth-types";

type DashboardStats = {
  mySheet?: {
    status: "draft" | "submitted" | "returned" | "approved" | "locked";
    goalCount: number;
    totalWeightage: number;
    avgScore: number | null;
  };
  currentQuarter?: "Q1" | "Q2" | "Q3" | "Q4";
  daysUntilWindowClose?: number;
  myGoalsAtRisk?: number;
  myManager?: { name: string; email: string; avatarInitials: string } | null;
  quarterCompletion?: Record<string, number | null>;
  teamSize?: number;
  sheetsApproved?: number;
  sheetsSubmitted?: number;
  sheetsDraft?: number;
  teamCheckInCompletion?: Record<string, { done: number; total: number }>;
  atRiskGoalsInTeam?: number;
  teamAverageScore?: Record<string, number | null>;
  totalEmployees?: number;
  totalManagers?: number;
  orgCheckInCompletion?: Record<string, number>;
  sheetsLocked?: number;
  sheetsReturned?: number;
  atRiskGoalsCount?: number;
  auditLogsToday?: number;
};

async function fetchDashboardStats() {
  const response = await fetch("/api/dashboard/stats");
  if (!response.ok) throw new Error("Unable to load dashboard stats");
  const payload = (await response.json()) as { data?: DashboardStats };
  return payload.data ?? {};
}

export function DashboardPage({ session }: { session: PortalSession | null }) {
  const user = session?.user;
  const statsQuery = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: fetchDashboardStats,
  });
  const stats = statsQuery.data;
  const role = user?.role ?? "employee";

  if (statsQuery.isLoading) {
    return (
      <div className="portal-page">
        <SkeletonBlock className="page-hero" />
        <div className="dashboard-grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonBlock key={index} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="portal-page">
      <div className="page-hero">
        <div>
          <span>FY 2025-26</span>
          <h2>
            {getGreeting()}, {user?.name ?? "there"}
          </h2>
          <p>
            Live goals, approvals, quarterly check-ins, and governance metrics from the AtomQuest database.
          </p>
        </div>
        <div className="hero-actions-portal">
          <Link href="/goals">Add Goal</Link>
          <Link href="/checkins">Update Check-in</Link>
        </div>
      </div>

      <div className="dashboard-grid">
        {role === "employee" ? (
          <>
            <PortalCard className="dashboard-card-large status-card">
              <div
                className="status-ring"
                style={{ "--ring-value": `${stats?.mySheet?.totalWeightage ?? 0}%` } as React.CSSProperties}
              >
                <strong>{stats?.mySheet?.totalWeightage ?? 0}%</strong>
                <span>used</span>
              </div>
              <div>
                <span className="card-eyebrow">Goal sheet status</span>
                <h3>{stats?.mySheet?.goalCount ?? 0} goals in the active cycle</h3>
                <p>Weightage, status, and latest achievement score are computed from your active goal sheet.</p>
                <div className="portal-inline-actions">
                  <StatusBadge status={stats?.mySheet?.status ?? "draft"} />
                  <Link href="/goals">
                    Open sheet <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            </PortalCard>

            <PortalCard className="mini-dashboard-card">
              <Users size={22} />
              <span>Your manager</span>
              <strong>{stats?.myManager?.name ?? "Unassigned"}</strong>
              <p>{stats?.myManager?.email ?? "Contact HR to assign a manager"}</p>
            </PortalCard>

            <PortalCard className="mini-dashboard-card">
              <Target size={22} />
              <span>At-risk goals</span>
              <strong>{stats?.myGoalsAtRisk ?? 0}</strong>
              <p>Latest score below 60%</p>
            </PortalCard>
          </>
        ) : (
          <>
            <PortalCard className="mini-dashboard-card">
              <Users size={22} />
              <span>{role === "admin" ? "Employees" : "Team size"}</span>
              <strong>{role === "admin" ? stats?.totalEmployees ?? 0 : stats?.teamSize ?? 0}</strong>
              <p>{role === "admin" ? `${stats?.totalManagers ?? 0} managers` : "Direct reports"}</p>
            </PortalCard>
            <PortalCard className="mini-dashboard-card">
              <ClipboardIcon />
              <span>Pending approvals</span>
              <strong>{stats?.sheetsSubmitted ?? 0}</strong>
              <p>Sheets waiting for review</p>
            </PortalCard>
            <PortalCard className="mini-dashboard-card">
              <AlertTriangle size={22} />
              <span>At-risk goals</span>
              <strong>{role === "admin" ? stats?.atRiskGoalsCount ?? 0 : stats?.atRiskGoalsInTeam ?? 0}</strong>
              <p>Latest score below 60%</p>
            </PortalCard>
          </>
        )}

        <PortalCard className="mini-dashboard-card">
          <CalendarDays size={22} />
          <span>Active window</span>
          <strong>{stats?.currentQuarter ?? "Q2"}</strong>
          <p>{stats?.daysUntilWindowClose ?? 0} days until this window closes</p>
        </PortalCard>

        <PortalCard className="dashboard-card-large team-overview-card" id="team-overview">
          <div className="card-title-row">
            <div>
              <span className="card-eyebrow">Check-in completion</span>
              <h3>{role === "employee" ? "Your quarterly progress" : "Team goal sheet status"}</h3>
            </div>
            <Link href={role === "employee" ? "/checkins" : "/team-goals"}>View details</Link>
          </div>
          <div className="quarter-progress-list">
            {quarters.map((quarter) => {
              const employeeValue = stats?.quarterCompletion?.[quarter] ?? null;
              const teamValue = stats?.teamCheckInCompletion?.[quarter];
              const orgValue = stats?.orgCheckInCompletion?.[quarter] ?? null;
              const value =
                role === "employee"
                  ? employeeValue ?? 0
                  : role === "admin"
                    ? orgValue ?? 0
                    : teamValue?.total
                      ? Math.round((teamValue.done / teamValue.total) * 100)
                      : 0;

              return (
                <div className="quarter-progress-row" key={quarter}>
                  <span>{quarter}</span>
                  <ProgressBar value={value} tone={value >= 80 ? "success" : "blue"} />
                  <span>{value}%</span>
                </div>
              );
            })}
          </div>
        </PortalCard>

        <PortalCard className="dashboard-card-full">
          <div className="card-title-row">
            <div>
              <span className="card-eyebrow">Achievement score</span>
              <h3>{role === "employee" ? "My average score" : "Average achievement score"}</h3>
            </div>
            <span className="portal-note">Scores are tracking indicators, not performance ratings.</span>
          </div>
          <div className="quarter-progress-list">
            {quarters.map((quarter) => {
              const score =
                role === "employee"
                  ? stats?.mySheet?.avgScore ?? null
                  : stats?.teamAverageScore?.[quarter] ?? null;
              return (
                <div className="quarter-progress-row" key={quarter}>
                  <span>{quarter}</span>
                  <ProgressBar value={score ?? 0} tone={score === null ? "warning" : "blue"} />
                  <ScoreChip score={score} />
                </div>
              );
            })}
          </div>
        </PortalCard>
      </div>
    </div>
  );
}

function ClipboardIcon() {
  return (
    <span className="inline-icon-stack">
      <Clock3 size={20} />
      <CheckCircle2 size={13} />
    </span>
  );
}
