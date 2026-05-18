"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { utils, writeFile } from "xlsx";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PortalCard, ScoreChip, SkeletonBlock } from "@/components/portal/portal-ui";

const reportTabs = ["Achievement Report", "Completion Dashboard", "Goal Distribution"];

type AchievementRow = {
  employee_name: string;
  employee_code: string | null;
  department: string | null;
  goal_title: string;
  thrust_area: string;
  uom_type: string;
  target: string;
  q1_score: string;
  q2_score: string;
  q3_score: string;
  q4_score: string;
  weightage: string;
};

type CompletionData = {
  goal_setting_completion: {
    submitted: number;
    approved: number;
    pending: number;
    not_started: number;
  };
  department_breakdown: Array<{ department: string; completion_percent: number; at_risk_goals: number }>;
};

async function fetchAchievement() {
  const response = await fetch("/api/reports/achievement");
  const payload = await response.json();
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message ?? "Unable to load achievement report");
  }
  return (payload.data?.rows ?? []) as AchievementRow[];
}

async function fetchCompletion() {
  const response = await fetch("/api/reports/completion-dashboard");
  const payload = await response.json();
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message ?? "Unable to load completion dashboard");
  }
  return payload.data as CompletionData;
}

function numericScore(value: string | number | null | undefined) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState(reportTabs[0]);
  const achievementQuery = useQuery({ queryKey: ["reports", "achievement"], queryFn: fetchAchievement });
  const completionQuery = useQuery({ queryKey: ["reports", "completion"], queryFn: fetchCompletion });
  const achievementRows = achievementQuery.data ?? [];
  const completion = completionQuery.data;

  function exportCsv() {
    window.location.href = "/api/reports/achievement?format=csv";
    toast.success("CSV export prepared.");
  }

  function exportExcel() {
    const sheet = utils.json_to_sheet(achievementRows);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, sheet, "Achievement");
    writeFile(workbook, "atomquest-achievement-report.xlsx");
    toast.success("Excel export prepared.");
  }

  const distribution = useMemo(() => {
    const counts = achievementRows.reduce<Record<string, number>>((acc, row) => {
      acc[row.thrust_area] = (acc[row.thrust_area] ?? 0) + 1;
      return acc;
    }, {});
    const colors = ["#2563EB", "#8B5CF6", "#22C55E", "#F59E0B", "#EC4899", "#14B8A6"];
    return Object.entries(counts).map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length],
    }));
  }, [achievementRows]);

  const uomBreakdown = useMemo(
    () =>
      Object.entries(
        achievementRows.reduce<Record<string, number>>((acc, row) => {
          acc[row.uom_type] = (acc[row.uom_type] ?? 0) + 1;
          return acc;
        }, {})
      ).map(([name, value]) => ({ name, value })),
    [achievementRows]
  );

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
            <Button disabled={!achievementRows.length} onClick={exportExcel}><Download size={16} />Export Excel</Button>
          </div>
          {achievementQuery.isLoading ? <SkeletonBlock /> : (
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
                  {achievementRows.slice(0, 20).map((row) => (
                    <tr key={`${row.employee_name}-${row.goal_title}`}>
                      <td>{row.employee_name}</td>
                      <td>{row.department}</td>
                      <td><strong>{row.goal_title}</strong><small>{row.thrust_area}</small></td>
                      <td>{row.target}</td>
                      <td><ScoreChip score={numericScore(row.q1_score)} /></td>
                      <td><ScoreChip score={numericScore(row.q2_score)} /></td>
                      <td>{row.weightage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}

      {activeTab === "Completion Dashboard" ? (
        <div className="reports-grid">
          <PortalCard className="report-summary-card">
            <span>Submitted</span>
            <strong>{completion?.goal_setting_completion.submitted ?? 0}</strong>
          </PortalCard>
          <PortalCard className="report-summary-card">
            <span>Approved</span>
            <strong>{completion?.goal_setting_completion.approved ?? 0}</strong>
          </PortalCard>
          <PortalCard className="report-summary-card">
            <span>Pending</span>
            <strong>{completion?.goal_setting_completion.pending ?? 0}</strong>
          </PortalCard>
          <PortalCard className="report-summary-card">
            <span>Not started</span>
            <strong>{completion?.goal_setting_completion.not_started ?? 0}</strong>
          </PortalCard>
          <PortalCard className="dashboard-card-full">
            <div className="completion-card-grid">
              {(completion?.department_breakdown ?? []).map((item) => (
                <article key={item.department}>
                  <strong>{item.department}</strong>
                  <span>{item.completion_percent}% complete</span>
                  <span>{item.at_risk_goals} at-risk goals</span>
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
        </div>
      ) : null}
    </div>
  );
}
