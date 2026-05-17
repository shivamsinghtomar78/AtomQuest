"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { utils, writeFile } from "xlsx";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { demoGoals, getAverageQuarterScore, quarters, teamMembers, thrustAreas, uomLabel } from "@/lib/portal-data";
import { Button } from "@/components/ui/button";
import { PortalCard, ScoreChip, StatusBadge } from "@/components/portal/portal-ui";

const reportTabs = ["Achievement Report", "Completion Dashboard", "Goal Distribution"];

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState(reportTabs[0]);
  const achievementRows = useMemo(
    () =>
      teamMembers.flatMap((member) =>
        member.goals.map((goal) => ({
          employee: member.name,
          code: member.id.toUpperCase(),
          department: member.department,
          title: goal.title,
          thrustArea: goal.thrustArea,
          uom: uomLabel(goal.uomType),
          target: goal.target,
          weightage: `${goal.weightage}%`,
          q1: goal.updates.Q1.actual,
          q1Score: goal.updates.Q1.score,
          q2: goal.updates.Q2.actual,
          q2Score: goal.updates.Q2.score,
          q3: goal.updates.Q3.actual,
          q3Score: goal.updates.Q3.score,
          q4: goal.updates.Q4.actual,
          q4Score: goal.updates.Q4.score,
        }))
      ),
    []
  );

  function exportCsv() {
    const header = Object.keys(achievementRows[0]).join(",");
    const body = achievementRows
      .map((row) => Object.values(row).map((value) => `"${String(value ?? "")}"`).join(","))
      .join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "atomquest-achievement-report.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("CSV export prepared.");
  }

  function exportExcel() {
    const sheet = utils.json_to_sheet(achievementRows);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, sheet, "Achievement");
    writeFile(workbook, "atomquest-achievement-report.xlsx");
    toast.success("Excel export prepared.");
  }

  const distribution = thrustAreas.map((area) => ({
    name: area.name,
    value: demoGoals.filter((goal) => goal.thrustArea === area.name).length,
    color: area.color,
  })).filter((item) => item.value > 0);

  const uomBreakdown = Object.entries(
    demoGoals.reduce<Record<string, number>>((acc, goal) => {
      acc[uomLabel(goal.uomType)] = (acc[uomLabel(goal.uomType)] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const trendData = quarters.map((quarter) => ({
    quarter,
    score: getAverageQuarterScore(quarter) ?? 0,
  }));

  return (
    <div className="portal-page">
      <div className="page-title-row">
        <div>
          <span>Reports</span>
          <h2>Achievement and completion analytics</h2>
          <p>Exportable governance reports plus visual dashboard views.</p>
        </div>
      </div>

      <div className="portal-tabs" role="tablist">
        {reportTabs.map((tab) => (
          <button className={activeTab === tab ? "is-active" : ""} key={tab} onClick={() => setActiveTab(tab)} type="button">
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Achievement Report" ? (
        <>
          <div className="filter-bar">
            <select><option>FY 2025-26</option></select>
            <select><option>All quarters</option><option>Q1</option><option>Q2</option></select>
            <select><option>All departments</option></select>
            <Button onClick={exportCsv} variant="secondary"><Download size={16} />Export CSV</Button>
            <Button onClick={exportExcel}><Download size={16} />Export Excel</Button>
          </div>
          <div className="portal-table-wrap">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Goal Title</th>
                  <th>Target</th>
                  <th>Q1 Score</th>
                  <th>Q2 Score</th>
                  <th>Weightage</th>
                </tr>
              </thead>
              <tbody>
                {achievementRows.slice(0, 12).map((row) => (
                  <tr key={`${row.employee}-${row.title}`}>
                    <td>{row.employee}</td>
                    <td>{row.department}</td>
                    <td><strong>{row.title}</strong><small>{row.thrustArea}</small></td>
                    <td>{row.target}</td>
                    <td><ScoreChip score={row.q1Score} /></td>
                    <td><ScoreChip score={row.q2Score} /></td>
                    <td>{row.weightage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {activeTab === "Completion Dashboard" ? (
        <div className="reports-grid">
          <PortalCard className="report-summary-card">
            <span>Submitted</span>
            <strong>18</strong>
          </PortalCard>
          <PortalCard className="report-summary-card">
            <span>Approved</span>
            <strong>14</strong>
          </PortalCard>
          <PortalCard className="report-summary-card">
            <span>Pending</span>
            <strong>4</strong>
          </PortalCard>
          <PortalCard className="report-summary-card">
            <span>Not started</span>
            <strong>2</strong>
          </PortalCard>
          <PortalCard className="dashboard-card-full">
            <div className="completion-card-grid">
              {teamMembers.map((member) => (
                <article key={member.id}>
                  <div className="avatar">{member.initials}</div>
                  <strong>{member.name}</strong>
                  <span>{member.department}</span>
                  <StatusBadge status={member.status} />
                  <div className="quarter-dots">
                    {quarters.map((quarter) => (
                      <span className={member.quarters[quarter] ? "is-done" : ""} key={quarter}>
                        {quarter}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </PortalCard>
        </div>
      ) : null}

      {activeTab === "Goal Distribution" ? (
        <div className="chart-grid">
          <PortalCard>
            <h3>Goal distribution by thrust area</h3>
            <ResponsiveContainer height={280} width="100%">
              <PieChart>
                <Pie data={distribution} dataKey="value" innerRadius={64} outerRadius={98} paddingAngle={3}>
                  {distribution.map((item) => <Cell fill={item.color} key={item.name} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </PortalCard>
          <PortalCard>
            <h3>UoM type breakdown</h3>
            <ResponsiveContainer height={280} width="100%">
              <BarChart data={uomBreakdown}>
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#2563EB" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </PortalCard>
          <PortalCard className="dashboard-card-full">
            <h3>QoQ average score trend</h3>
            <ResponsiveContainer height={260} width="100%">
              <LineChart data={trendData}>
                <XAxis dataKey="quarter" />
                <YAxis domain={[0, 150]} />
                <Tooltip />
                <Line dataKey="score" stroke="#8B5CF6" strokeWidth={3} type="monotone" />
              </LineChart>
            </ResponsiveContainer>
          </PortalCard>
        </div>
      ) : null}
    </div>
  );
}
