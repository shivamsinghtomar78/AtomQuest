"use client";

import Link from "next/link";
import { Fragment } from "react";
import { useMemo, useState } from "react";
import { ChevronDown, Search, Send } from "lucide-react";
import { toast } from "sonner";
import { quarters, teamMembers } from "@/lib/portal-data";
import { Button } from "@/components/ui/button";
import { ScoreChip, StatusBadge } from "@/components/portal/portal-ui";
import { cn } from "@/lib/utils";

export function TeamGoalsPage() {
  const [status, setStatus] = useState("all");
  const [department, setDepartment] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>("emp-priya");

  const departments = Array.from(new Set(teamMembers.map((member) => member.department)));
  const rows = useMemo(
    () =>
      teamMembers.filter((member) => {
        const statusMatch = status === "all" || member.status === status;
        const departmentMatch = department === "all" || member.department === department;
        const searchMatch = member.name.toLowerCase().includes(search.toLowerCase());
        return statusMatch && departmentMatch && searchMatch;
      }),
    [department, search, status]
  );

  return (
    <div className="portal-page">
      <div className="page-title-row">
        <div>
          <span>Team Goals</span>
          <h2>Review goal sheets and check-in completion</h2>
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
          <option value="approved">Approved</option>
          <option value="locked">Locked</option>
        </select>
        <select value={department} onChange={(event) => setDepartment(event.target.value)}>
          <option value="all">All departments</option>
          {departments.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

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
            {rows.map((member) => {
              const used = member.goals.reduce((total, goal) => total + goal.weightage, 0);
              return (
                <Fragment key={member.id}>
                  <tr key={member.id}>
                    <td>
                      <button className="employee-cell" onClick={() => setExpanded(expanded === member.id ? null : member.id)} type="button">
                        <span className="avatar">{member.initials}</span>
                        <span>
                          <strong>{member.name}</strong>
                          <small>{member.designation}</small>
                        </span>
                        <ChevronDown className={cn(expanded === member.id && "is-open")} size={16} />
                      </button>
                    </td>
                    <td>{member.department}</td>
                    <td>{member.goals.length} / 8</td>
                    <td>{used}%</td>
                    <td><StatusBadge status={member.status} /></td>
                    {quarters.map((quarter) => (
                      <td key={quarter}>
                        <span className={cn("completion-dot", member.quarters[quarter] && "is-done")} />
                      </td>
                    ))}
                    <td>
                      <div className="table-actions">
                        <Link href={`/app/team-goals/${member.id}/review`}>Review</Link>
                        <Link href={`/app/manager-checkins/${member.id}`}>Check-in</Link>
                      </div>
                    </td>
                  </tr>
                  {expanded === member.id ? (
                    <tr className="expanded-row" key={`${member.id}-expanded`}>
                      <td colSpan={10}>
                        <div className="expanded-goals">
                          {member.goals.map((goal) => (
                            <article key={goal.id}>
                              <span className="thrust-pill" style={{ "--thrust-color": goal.color } as React.CSSProperties}>
                                {goal.thrustArea}
                              </span>
                              <h3>{goal.title}</h3>
                              <p>{goal.description}</p>
                              <div>
                                <span>{goal.weightage}%</span>
                                <ScoreChip score={goal.score} />
                              </div>
                            </article>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
