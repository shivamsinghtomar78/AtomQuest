"use client";

import type { Session } from "next-auth";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, Clock3, Target, Users } from "lucide-react";
import {
  demoGoals,
  getAverageQuarterScore,
  getGreeting,
  getPortalUser,
  getWeightageUsed,
  quarters,
  teamMembers,
} from "@/lib/portal-data";
import { PortalCard, ProgressBar, ScoreChip, StatusBadge } from "@/components/portal/portal-ui";

export function DashboardPage({ session }: { session: Session | null }) {
  const user = getPortalUser(session);
  const weightage = getWeightageUsed();
  const approvedCount = demoGoals.filter((goal) => goal.status === "approved" || goal.status === "locked").length;
  const atRisk = demoGoals.filter((goal) => typeof goal.score === "number" && goal.score < 60).length;
  const pendingApprovals = teamMembers.filter((member) => member.status === "submitted").length;

  return (
    <div className="portal-page">
      <div className="page-hero">
        <div>
          <span>FY 2025-26</span>
          <h2>
            {getGreeting()}, {user.name}
          </h2>
          <p>
            Keep goals, approvals, and quarterly achievement updates moving with clear ownership.
          </p>
        </div>
        <div className="hero-actions-portal">
          <Link href="/app/goals">Add Goal</Link>
          <Link href="/app/checkins">Update Check-in</Link>
        </div>
      </div>

      <div className="dashboard-grid">
        <PortalCard className="dashboard-card-large status-card">
          <div className="status-ring" style={{ "--ring-value": `${weightage}%` } as React.CSSProperties}>
            <strong>{weightage}%</strong>
            <span>used</span>
          </div>
          <div>
            <span className="card-eyebrow">Goal sheet status</span>
            <h3>Weightage is ready for review</h3>
            <p>Goal sheet has {demoGoals.length} of 8 goals and meets the 100% total weightage rule.</p>
            <div className="portal-inline-actions">
              <StatusBadge status="draft" />
              <Link href="/app/goals">
                Open sheet <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </PortalCard>

        <PortalCard className="mini-dashboard-card">
          {user.role === "employee" ? <Users size={22} /> : <ClipboardIcon />}
          <span>{user.role === "employee" ? "Your manager" : "Pending approvals"}</span>
          <strong>{user.role === "employee" ? user.manager : pendingApprovals}</strong>
          <p>{user.role === "employee" ? "L1 manager assigned" : "Sheets waiting for review"}</p>
        </PortalCard>

        <PortalCard className="mini-dashboard-card">
          <CalendarDays size={22} />
          <span>Active window</span>
          <strong>Goal Setting</strong>
          <p>12 days remaining before Q1 opens</p>
        </PortalCard>

        <PortalCard className="mini-dashboard-card">
          <Target size={22} />
          <span>My goals</span>
          <strong>{demoGoals.length} / 8</strong>
          <p>{approvedCount} approved or locked</p>
        </PortalCard>

        <PortalCard className="dashboard-card-large team-overview-card" id="team-overview">
          <div className="card-title-row">
            <div>
              <span className="card-eyebrow">Team completion</span>
              <h3>{user.role === "employee" ? "Your check-in trail" : "Team overview"}</h3>
            </div>
            <Link href="/app/team-goals">View team</Link>
          </div>
          <div className="team-status-list">
            {teamMembers.slice(0, user.role === "employee" ? 2 : 4).map((member) => (
              <div className="team-status-row" key={member.id}>
                <div className="avatar">{member.initials}</div>
                <div>
                  <strong>{member.name}</strong>
                  <span>{member.department}</span>
                </div>
                <StatusBadge status={member.status} />
                <div className="quarter-dots">
                  {quarters.map((quarter) => (
                    <span className={member.quarters[quarter] ? "is-done" : ""} key={quarter}>
                      {quarter}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </PortalCard>

        <PortalCard className="mini-dashboard-card">
          <AlertTriangle size={22} />
          <span>At-risk goals</span>
          <strong>{atRisk}</strong>
          <p>Scores below 60%</p>
        </PortalCard>

        <PortalCard className="dashboard-card-full">
          <div className="card-title-row">
            <div>
              <span className="card-eyebrow">Quarter progress</span>
              <h3>Average achievement score</h3>
            </div>
            <span className="portal-note">Scores are tracking indicators, not performance ratings.</span>
          </div>
          <div className="quarter-progress-list">
            {quarters.map((quarter) => {
              const score = getAverageQuarterScore(quarter);
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
