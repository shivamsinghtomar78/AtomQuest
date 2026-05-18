"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";
import { computeProgressScore } from "@/lib/scoring";
import { quarters, type Quarter, type UpdateStatus } from "@/lib/portal-data";
import { Button } from "@/components/ui/button";
import { EmptyState, InlineValidation, PortalCard, ScoreChip, SkeletonBlock, StatusBadge } from "@/components/portal/portal-ui";
import { apiJson, jsonRequest } from "@/lib/api/client";

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
  cycle: {
    q1Opens: string;
    q2Opens: string;
    q3Opens: string;
    q4Opens: string;
  };
  goals: Goal[];
};

async function fetchMySheet() {
  const payload = await apiJson<{ items: GoalSheet[] }>("/api/goal-sheets");
  return payload.items?.[0] ?? null;
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

function currentQuarter(cycle?: GoalSheet["cycle"]): Quarter {
  if (!cycle) return "Q2";
  const today = new Date();
  if (today >= new Date(cycle.q4Opens)) return "Q4";
  if (today >= new Date(cycle.q3Opens)) return "Q3";
  if (today >= new Date(cycle.q2Opens)) return "Q2";
  return "Q1";
}

export function CheckinsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const sheetQuery = useQuery({ queryKey: ["goal-sheets", "mine"], queryFn: fetchMySheet });
  const goals = sheetQuery.data?.goals ?? [];
  const selectedGoalId = searchParams.get("goal");
  const selectedGoalIndex = goals.findIndex((goal) => goal.id === selectedGoalId);
  const activeGoalIndex = selectedGoalIndex >= 0 ? selectedGoalIndex : 0;
  const quarterParam = searchParams.get("quarter");
  const quarter: Quarter = quarters.includes(quarterParam as Quarter) ? (quarterParam as Quarter) : currentQuarter(sheetQuery.data?.cycle);
  const [actualValue, setActualValue] = useState("");
  const [actualDate, setActualDate] = useState("");
  const [zeroActual, setZeroActual] = useState(true);
  const [status, setStatus] = useState<UpdateStatus>("on_track");
  const [employeeNotes, setEmployeeNotes] = useState("");
  const activeGoal = goals[Math.min(activeGoalIndex, Math.max(goals.length - 1, 0))];

  const existingUpdate = activeGoal?.quarterlyUpdates.find((update) => update.quarter === quarter);

  useEffect(() => {
    setActualValue(existingUpdate?.actualValue?.toString() ?? "");
    setActualDate(existingUpdate?.actualDate?.slice(0, 10) ?? "");
    setZeroActual(existingUpdate?.actualZero ?? true);
    setStatus(existingUpdate?.status ?? "on_track");
    setEmployeeNotes(existingUpdate?.employeeNotes ?? "");
  }, [activeGoal?.id, existingUpdate, quarter]);

  const score = useMemo(() => {
    if (!activeGoal) return null;
    if (status === "not_started") return null;
    if (activeGoal.uomType === "timeline") {
      if (!actualDate) return null;
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
    if (!actualValue.trim() || !Number.isFinite(Number(actualValue))) return null;
    return computeProgressScore({
      uomType: activeGoal.uomType,
      targetValue: activeGoal.targetValue,
      actualValue: Number(actualValue),
    });
  }, [activeGoal, actualDate, actualValue, status, zeroActual]);

  const actualError = useMemo(() => {
    if (!activeGoal || status === "not_started") return null;
    if (activeGoal.uomType === "timeline" && !actualDate) return "Enter the actual completion date.";
    if (!["timeline", "zero"].includes(activeGoal.uomType)) {
      if (!actualValue.trim()) return "Enter an actual value.";
      if (!Number.isFinite(Number(actualValue))) return "Actual value must be a valid number.";
    }
    return null;
  }, [activeGoal, actualDate, actualValue, status]);

  function setSelection(next: { goalIndex?: number; quarter?: Quarter }) {
    const params = new URLSearchParams(searchParams);
    const goal = goals[next.goalIndex ?? activeGoalIndex];
    if (goal) params.set("goal", goal.id);
    if (next.quarter) params.set("quarter", next.quarter);
    router.push(`${pathname}?${params.toString()}`);
  }

  const saveUpdate = useMutation({
    mutationFn: async () => {
      return apiJson("/api/quarterly-updates", jsonRequest("POST", {
          goal_id: activeGoal.id,
          quarter,
          actual_value: status === "not_started" || activeGoal.uomType === "timeline" || activeGoal.uomType === "zero" ? null : Number(actualValue),
          actual_date: status === "not_started" ? null : activeGoal.uomType === "timeline" ? actualDate : null,
          actual_zero: status === "not_started" ? null : activeGoal.uomType === "zero" ? zeroActual : null,
          status,
          employee_notes: employeeNotes,
        }));
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
          <button className={quarter === item ? "is-active" : ""} key={item} onClick={() => setSelection({ quarter: item })} type="button">
            {item}
            <span>{activeGoal?.quarterlyUpdates.some((update) => update.quarter === item) ? "Saved" : "Open"}</span>
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
              onClick={() => setSelection({ goalIndex: Math.max(0, activeGoalIndex - 1) })}
              type="button"
              variant="secondary"
            >
              <ArrowLeft size={16} />
              Previous
            </Button>
            <Button
              disabled={activeGoalIndex === goals.length - 1}
              onClick={() => setSelection({ goalIndex: Math.min(goals.length - 1, activeGoalIndex + 1) })}
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
          {actualError ? <InlineValidation tone="danger">{actualError}</InlineValidation> : null}

          <Button disabled={Boolean(actualError) || saveUpdate.isPending} onClick={() => saveUpdate.mutate()} type="button">
            <Save size={16} />
            {saveUpdate.isPending ? "Saving..." : "Save Update"}
          </Button>
        </PortalCard>
      </div>
    </div>
  );
}
