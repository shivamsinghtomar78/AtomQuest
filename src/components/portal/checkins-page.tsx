"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";
import { computeProgressScore } from "@/lib/scoring";
import { quarters, type Quarter, type UpdateStatus } from "@/lib/portal-data";
import { Button } from "@/components/ui/button";
import { EmptyState, PortalCard, ScoreChip, SkeletonBlock, StatusBadge } from "@/components/portal/portal-ui";

type Goal = {
  id: string;
  title: string;
  description: string | null;
  uomType: "min_numeric" | "min_percent" | "max_numeric" | "max_percent" | "timeline" | "zero";
  targetValue: string | number | null;
  targetDate: string | null;
  weightage: string | number;
  isLocked: boolean;
  thrustArea: { name: string; colorHex: string };
  quarterlyUpdates: Array<{
    quarter: Quarter;
    actualValue: string | number | null;
    actualDate: string | null;
    actualZero: boolean | null;
    status: UpdateStatus;
    employeeNotes: string | null;
  }>;
};

type GoalSheet = {
  id: string;
  status: "draft" | "submitted" | "returned" | "approved" | "locked";
  goals: Goal[];
};

async function fetchMySheet() {
  const response = await fetch("/api/goal-sheets");
  const payload = await response.json();
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message ?? "Unable to load goals");
  }
  return (payload.data?.items?.[0] ?? null) as GoalSheet | null;
}

function numberValue(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function uomLabel(type: Goal["uomType"]) {
  const labels: Record<Goal["uomType"], string> = {
    min_numeric: "Min #",
    min_percent: "Min %",
    max_numeric: "Max #",
    max_percent: "Max %",
    timeline: "Timeline",
    zero: "Zero",
  };
  return labels[type];
}

function targetLabel(goal: Goal) {
  if (goal.uomType === "timeline") return goal.targetDate?.slice(0, 10) ?? "No date";
  if (goal.uomType === "zero") return "0";
  return goal.targetValue?.toString() ?? "No target";
}

export function CheckinsPage() {
  const queryClient = useQueryClient();
  const sheetQuery = useQuery({ queryKey: ["goal-sheets", "mine"], queryFn: fetchMySheet });
  const goals = sheetQuery.data?.goals ?? [];
  const [activeGoalIndex, setActiveGoalIndex] = useState(0);
  const [quarter, setQuarter] = useState<Quarter>("Q2");
  const [actualValue, setActualValue] = useState("");
  const [actualDate, setActualDate] = useState("");
  const [zeroActual, setZeroActual] = useState(true);
  const [status, setStatus] = useState<UpdateStatus>("on_track");
  const [employeeNotes, setEmployeeNotes] = useState("");
  const activeGoal = goals[Math.min(activeGoalIndex, Math.max(goals.length - 1, 0))];

  const existingUpdate = activeGoal?.quarterlyUpdates.find((update) => update.quarter === quarter);

  useEffect(() => {
    if (!existingUpdate) return;
    setActualValue(existingUpdate.actualValue?.toString() ?? "");
    setActualDate(existingUpdate.actualDate?.slice(0, 10) ?? "");
    setZeroActual(existingUpdate.actualZero ?? true);
    setStatus(existingUpdate.status);
    setEmployeeNotes(existingUpdate.employeeNotes ?? "");
  }, [existingUpdate]);

  const score = useMemo(() => {
    if (!activeGoal) return null;
    if (activeGoal.uomType === "timeline") {
      return computeProgressScore({
        uomType: "timeline",
        targetDate: activeGoal.targetDate,
        actualDate,
      });
    }
    if (activeGoal.uomType === "zero") {
      return computeProgressScore({
        uomType: "zero",
        actualValue: zeroActual ? 0 : 1,
      });
    }
    return computeProgressScore({
      uomType: activeGoal.uomType,
      targetValue: activeGoal.targetValue,
      actualValue: Number(actualValue),
    });
  }, [activeGoal, actualDate, actualValue, zeroActual]);

  const saveUpdate = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/quarterly-updates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          goal_id: activeGoal.id,
          quarter,
          actual_value: activeGoal.uomType === "timeline" || activeGoal.uomType === "zero" ? null : Number(actualValue),
          actual_date: activeGoal.uomType === "timeline" ? actualDate : null,
          actual_zero: activeGoal.uomType === "zero" ? zeroActual : null,
          status,
          employee_notes: employeeNotes,
        }),
      });
      const payload = await response.json();
      if (!response.ok || payload.success === false) {
        throw new Error(payload.message ?? "Unable to save update");
      }
      return payload.data;
    },
    onSuccess: () => {
      toast.success(`${quarter} achievement saved`);
      queryClient.invalidateQueries({ queryKey: ["goal-sheets", "mine"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to save update"),
  });

  if (sheetQuery.isLoading) {
    return (
      <div className="portal-page">
        <SkeletonBlock className="page-title-row" />
        <SkeletonBlock />
      </div>
    );
  }

  if (!activeGoal) {
    return (
      <div className="portal-page">
        <EmptyState
          description="Approved goals will appear here when your goal sheet is ready for quarterly updates."
          title="No goals ready for check-ins"
        />
      </div>
    );
  }

  return (
    <div className="portal-page">
      <div className="page-title-row">
        <div>
          <span>Quarterly Updates</span>
          <h2>Log actual achievement</h2>
          <p>Progress scores are visibility indicators only and are not performance ratings.</p>
        </div>
      </div>

      <div className="quarter-tabs">
        {quarters.map((item) => (
          <button className={quarter === item ? "is-active" : ""} key={item} onClick={() => setQuarter(item)} type="button">
            {item}
            <span>{existingUpdate && item === quarter ? "Saved" : "Open"}</span>
          </button>
        ))}
      </div>

      <div className="checkin-layout">
        <PortalCard className="checkin-goal-panel">
          <span className="thrust-pill" style={{ "--thrust-color": activeGoal.thrustArea.colorHex } as React.CSSProperties}>
            {activeGoal.thrustArea.name}
          </span>
          <h3>{activeGoal.title}</h3>
          <p>{activeGoal.description}</p>
          <dl>
            <div>
              <dt>UoM</dt>
              <dd>{uomLabel(activeGoal.uomType)}</dd>
            </div>
            <div>
              <dt>Target</dt>
              <dd>{targetLabel(activeGoal)}</dd>
            </div>
            <div>
              <dt>Weightage</dt>
              <dd>{numberValue(activeGoal.weightage)}%</dd>
            </div>
          </dl>
          <StatusBadge status={existingUpdate?.status ?? "not_started"} />
          <div className="goal-nav">
            <Button
              disabled={activeGoalIndex === 0}
              onClick={() => setActiveGoalIndex((index) => Math.max(0, index - 1))}
              type="button"
              variant="secondary"
            >
              <ArrowLeft size={16} />
              Previous
            </Button>
            <Button
              disabled={activeGoalIndex === goals.length - 1}
              onClick={() => setActiveGoalIndex((index) => Math.min(goals.length - 1, index + 1))}
              type="button"
              variant="secondary"
            >
              Next
              <ArrowRight size={16} />
            </Button>
          </div>
        </PortalCard>

        <PortalCard className="checkin-input-panel">
          <div className="card-title-row">
            <div>
              <span className="card-eyebrow">{quarter} update</span>
              <h3>Actual achievement</h3>
            </div>
            <span className="window-chip">Window checked by API</span>
          </div>

          {activeGoal.uomType === "timeline" ? (
            <label className="form-field">
              <span>Actual completion date</span>
              <input type="date" value={actualDate} onChange={(event) => setActualDate(event.target.value)} />
            </label>
          ) : activeGoal.uomType === "zero" ? (
            <label className="toggle-row">
              <input checked={zeroActual} onChange={(event) => setZeroActual(event.target.checked)} type="checkbox" />
              <span>Zero incidents achieved for this quarter</span>
            </label>
          ) : (
            <label className="form-field">
              <span>Actual value</span>
              <input inputMode="decimal" value={actualValue} onChange={(event) => setActualValue(event.target.value)} />
            </label>
          )}

          <div className="status-radio-group">
            {(["not_started", "on_track", "completed"] as UpdateStatus[]).map((item) => (
              <label className={status === item ? "is-selected" : ""} key={item}>
                <input checked={status === item} onChange={() => setStatus(item)} type="radio" />
                <StatusBadge status={item} />
              </label>
            ))}
          </div>

          <label className="form-field">
            <span>Employee notes</span>
            <textarea placeholder="Add context, blockers, or support needed." rows={5} value={employeeNotes} onChange={(event) => setEmployeeNotes(event.target.value)} />
          </label>

          <div className="score-preview">
            <span>Live score preview</span>
            <ScoreChip score={score === null ? null : Math.round(score)} />
          </div>

          <Button disabled={saveUpdate.isPending} onClick={() => saveUpdate.mutate()} type="button">
            <Save size={16} />
            {saveUpdate.isPending ? "Saving..." : "Save Update"}
          </Button>
        </PortalCard>
      </div>
    </div>
  );
}
