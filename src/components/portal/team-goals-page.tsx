"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Search, Send } from "lucide-react";
import { toast } from "sonner";
import { quarters } from "@/lib/portal-data";
import { Button } from "@/components/ui/button";
import { EmptyState, ScoreChip, SkeletonBlock, StatusBadge } from "@/components/portal/portal-ui";
import { cn } from "@/lib/utils";

type GoalSheet = {
  id: string;
  status: "draft" | "submitted" | "returned" | "approved" | "locked";
  totalWeightage: string | number;
  employee: {
    id: string;
    name: string;
    email: string;
    department: string | null;
    designation: string | null;
    employeeCode: string | null;
  };
  goals: Array<{
    id: string;
    title: string;
    description: string | null;
    weightage: string | number;
    thrustArea: { name: string; colorHex: string };
    quarterlyUpdates: Array<{ quarter: string; computedScore: string | number | null }>;
  }>;
  checkinComments: Array<{ quarter: string }>;
};

async function fetchGoalSheets() {
  const response = await fetch("/api/goal-sheets");
  const payload = await response.json();
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message ?? "Unable to load team goals");
  }
  return (payload.data?.items ?? []) as GoalSheet[];
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function numberValue(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function latestScore(goal: GoalSheet["goals"][number]) {
  const latest = [...goal.quarterlyUpdates]
    .filter((update) => update.computedScore !== null)
    .sort((a, b) => quarters.indexOf(b.quarter as never) - quarters.indexOf(a.quarter as never))[0];
  return latest?.computedScore === null || latest?.computedScore === undefined
    ? null
    : numberValue(latest.computedScore);
}

export function TeamGoalsPage({ mode = "goals" }: { mode?: "goals" | "checkins" }) {
  const [status, setStatus] = useState("all");
  const [department, setDepartment] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const sheetsQuery = useQuery({ queryKey: ["goal-sheets", "team"], queryFn: fetchGoalSheets });
  const sheets = sheetsQuery.data ?? [];

  useEffect(() => {
    const saved = sessionStorage.getItem("atomquest:team-goals-scroll");
    if (!saved) return;

    requestAnimationFrame(() => {
      window.scrollTo({ top: Number(saved) || 0 });
      sessionStorage.removeItem("atomquest:team-goals-scroll");
    });
  }, []);

  function saveScrollPosition() {
    sessionStorage.setItem("atomquest:team-goals-scroll", String(window.scrollY));
  }

  const departments = Array.from(new Set(sheets.map((sheet) => sheet.employee.department).filter(Boolean)));
  const rows = useMemo(
    () =>
      sheets.filter((sheet) => {
        const statusMatch = status === "all" || sheet.status === status;
        const departmentMatch = department === "all" || sheet.employee.department === department;
        const searchMatch = sheet.employee.name.toLowerCase().includes(search.toLowerCase());
        return statusMatch && departmentMatch && searchMatch;
      }),
    [department, search, sheets, status]
  );

  if (sheetsQuery.isLoading) {
    return (
      <div className="portal-page">
        <SkeletonBlock className="page-title-row" />
        <SkeletonBlock />
        <SkeletonBlock />
      </div>
    );
  }

  return (
    <div className="portal-page">
      <div className="page-title-row">
        <div>
          <span>{mode === "checkins" ? "Manager Check-ins" : "Team Goals"}</span>
          <h2>{mode === "checkins" ? "Manage quarterly check-ins" : "Review goal sheets and check-in completion"}</h2>
          <p>Expand a team member to inspect goals before approval or check-in.</p>
        </div>
        <Button onClick={() => toast.info("Reminder notifications queued for pending employees.")}>
          <Send size={16} />
          Send Reminder
        </Button>
      </div>

      <div className="filter-bar">
        <label>
          <Search size={16} />
          <input placeholder="Search by name" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="submitted">Pending Approval</option>
          <option value="returned">Returned</option>
          <option value="approved">Approved</option>
          <option value="locked">Locked</option>
        </select>
        <select value={department} onChange={(event) => setDepartment(event.target.value)}>
          <option value="all">All departments</option>
          {departments.map((item) => (
            <option key={item} value={item ?? ""}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {rows.length ? (
        <div className="portal-table-wrap">
          <table className="portal-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Goals</th>
                <th>Weightage</th>
                <th>Sheet Status</th>
                {quarters.map((quarter) => (
                  <th key={quarter}>{quarter}</th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((sheet) => (
                <Fragment key={sheet.id}>
                  <tr>
                    <td>
                      <button className="employee-cell" onClick={() => setExpanded(expanded === sheet.id ? null : sheet.id)} type="button">
                        <span className="avatar">{initials(sheet.employee.name)}</span>
                        <span>
                          <strong>{sheet.employee.name}</strong>
                          <small>{sheet.employee.designation}</small>
                        </span>
                        <ChevronDown className={cn(expanded === sheet.id && "is-open")} size={16} />
                      </button>
                    </td>
                    <td>{sheet.employee.department}</td>
                    <td>{sheet.goals.length} / 8</td>
                    <td>{numberValue(sheet.totalWeightage)}%</td>
                    <td><StatusBadge status={sheet.status} /></td>
                    {quarters.map((quarter) => (
                      <td key={quarter}>
                        <span className={cn("completion-dot", sheet.checkinComments.some((comment) => comment.quarter === quarter) && "is-done")} />
                      </td>
                    ))}
                    <td>
                      <div className="table-actions">
                        <Link href={`/team-goals/${sheet.id}/review`} onClick={saveScrollPosition}>Review</Link>
                        <Link href={`/manager-checkins/${sheet.id}`} onClick={saveScrollPosition}>Check-in</Link>
                      </div>
                    </td>
                  </tr>
                  {expanded === sheet.id ? (
                    <tr className="expanded-row">
                      <td colSpan={10}>
                        <div className="expanded-goals">
                          {sheet.goals.map((goal) => (
                            <article key={goal.id}>
                              <span className="thrust-pill" style={{ "--thrust-color": goal.thrustArea.colorHex } as React.CSSProperties}>
                                {goal.thrustArea.name}
                              </span>
                              <h3>{goal.title}</h3>
                              <p>{goal.description}</p>
                              <div>
                                <span>{numberValue(goal.weightage)}%</span>
                                <ScoreChip score={latestScore(goal)} />
                              </div>
                            </article>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          description="Contact your admin to assign direct reports to your profile."
          title="No team members assigned"
        />
      )}
    </div>
  );
}
