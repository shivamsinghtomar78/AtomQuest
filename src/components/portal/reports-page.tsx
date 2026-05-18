"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { utils, writeFile } from "xlsx";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataToolbar, EmptyState, PortalCard, ScoreChip, SkeletonBlock } from "@/components/portal/portal-ui";
import { apiJson, buildQuery } from "@/lib/api/client";

const reportTabs = ["Achievement Report", "Completion Dashboard", "Goal Distribution"];

type AchievementRow = {
  employee_name: string;
  employee_code: string | null;
  department: string | null;
  goal_title: string;
  thrust_area: string;
  uom_type: string;
  target: string;
  q1_actual: string;
  q2_actual: string;
  q3_actual: string;
  q4_actual: string;
  q1_score: string;
  q2_score: string;
  q3_score: string;
  q4_score: string;
  weightage: string;
  weighted_score: string | number;
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

async function fetchAchievement(params: { quarter?: string; department?: string; cycleId?: string }) {
  const payload = await apiJson<{ rows: AchievementRow[] }>(
    `/api/reports/achievement${buildQuery({
      quarter: params.quarter,
      department: params.department,
      cycle_id: params.cycleId,
    })}`
  );
  return payload.rows ?? [];
}

async function fetchCompletion(params: { cycleId?: string }) {
  return apiJson<CompletionData>(
    `/api/reports/completion-dashboard${buildQuery({ cycle_id: params.cycleId })}`
  );
}

function numericScore(value: string | number | null | undefined) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function ReportsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(reportTabs.includes(tabParam ?? "") ? tabParam! : reportTabs[0]);
  const quarter = searchParams.get("quarter") ?? "";
  const department = searchParams.get("department") ?? "";
  const cycleId = searchParams.get("cycle_id") ?? "";
  const achievementQuery = useQuery({
    queryKey: ["reports", "achievement", quarter, department, cycleId],
    queryFn: () => fetchAchievement({ quarter, department, cycleId }),
  });
  const completionQuery = useQuery({
    queryKey: ["reports", "completion", cycleId],
    queryFn: () => fetchCompletion({ cycleId }),
  });
  const achievementRows = achievementQuery.data ?? [];
  const completion = completionQuery.data;
  const departments = Array.from(new Set(achievementRows.map((row) => row.department).filter(Boolean)));

  function setQuery(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    router.push(params.size ? `${pathname}?${params.toString()}` : pathname);
  }

  function selectTab(tab: string) {
    setActiveTab(tab);
    setQuery({ tab });
  }

  function exportCsv() {
    window.location.href = `/api/reports/achievement${buildQuery({
      quarter,
      department,
      cycle_id: cycleId,
      format: "csv",
    })}`;
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
          <button className={activeTab === tab ? "is-active" : ""} key={tab} onClick={() => selectTab(tab)} type="button">
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Achievement Report" ? (
        <>
          <DataToolbar>
            <select aria-label="Cycle" value={cycleId} onChange={(event) => setQuery({ cycle_id: event.target.value })}>
              <option value="">Active cycle</option>
            </select>
            <select aria-label="Quarter" value={quarter} onChange={(event) => setQuery({ quarter: event.target.value })}>
              <option value="">All quarters</option>
              <option value="Q1">Q1</option>
              <option value="Q2">Q2</option>
              <option value="Q3">Q3</option>
              <option value="Q4">Q4</option>
            </select>
            <select aria-label="Department" value={department} onChange={(event) => setQuery({ department: event.target.value })}>
              <option value="">All departments</option>
              {departments.map((item) => (
                <option key={item} value={item ?? ""}>{item}</option>
              ))}
            </select>
            <Button onClick={exportCsv} variant="secondary"><Download size={16} />Export CSV</Button>
            <Button disabled={!achievementRows.length} onClick={exportExcel}><Download size={16} />Export Excel</Button>
          </DataToolbar>
          {achievementQuery.isLoading ? <SkeletonBlock /> : (
            achievementRows.length ? (
              <div className="portal-table-wrap">
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Code</th>
                    <th>Department</th>
                    <th>Goal Title</th>
                    <th>UoM</th>
                    <th>Target</th>
                    <th>Q1 Actual</th>
                    <th>Q1 Score</th>
                    <th>Q2 Actual</th>
                    <th>Q2 Score</th>
                    <th>Q3 Actual</th>
                    <th>Q3 Score</th>
                    <th>Q4 Actual</th>
                    <th>Q4 Score</th>
                    <th>Weightage</th>
                    <th>Weighted Score</th>
                  </tr>
                </thead>
                <tbody>
                  {achievementRows.map((row) => (
                    <tr key={`${row.employee_name}-${row.goal_title}`}>
                      <td>{row.employee_name}</td>
                      <td>{row.employee_code}</td>
                      <td>{row.department}</td>
                      <td><strong>{row.goal_title}</strong><small>{row.thrust_area}</small></td>
                      <td>{row.uom_type}</td>
                      <td>{row.target}</td>
                      <td>{row.q1_actual}</td>
                      <td><ScoreChip score={numericScore(row.q1_score)} /></td>
                      <td>{row.q2_actual}</td>
                      <td><ScoreChip score={numericScore(row.q2_score)} /></td>
                      <td>{row.q3_actual}</td>
                      <td><ScoreChip score={numericScore(row.q3_score)} /></td>
                      <td>{row.q4_actual}</td>
                      <td><ScoreChip score={numericScore(row.q4_score)} /></td>
                      <td>{row.weightage}%</td>
                      <td>{row.weighted_score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            ) : (
              <EmptyState title="No report rows" description="Adjust the report filters or add goal/check-in data first." />
            )
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
