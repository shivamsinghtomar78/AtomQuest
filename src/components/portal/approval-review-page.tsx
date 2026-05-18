"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalCard, ProgressBar, SkeletonBlock, StatusBadge } from "@/components/portal/portal-ui";
import { apiJson, jsonRequest } from "@/lib/api/client";

type GoalSheet = {
  id: string;
  status: "draft" | "submitted" | "returned" | "approved" | "locked";
  employee: {
    name: string;
    email: string;
    department: string | null;
    designation: string | null;
  };
  goals: Array<{
    id: string;
    title: string;
    description: string | null;
    targetValue: string | number | null;
    targetDate: string | null;
    weightage: string | number;
    thrustArea: { name: string; colorHex: string };
  }>;
};

async function fetchSheet(sheetId: string) {
  return apiJson<GoalSheet>(`/api/goal-sheets/${sheetId}`);
}

async function reviewSheet(input: {
  sheetId: string;
  approved: boolean;
  remarks?: string | null;
  updatedGoals: Array<{ id: string; target_value?: number | null; target_date?: string | null; weightage?: number }>;
}) {
  return apiJson<GoalSheet>(`/api/goal-sheets/${input.sheetId}/approve`, jsonRequest("PATCH", {
      approved: input.approved,
      remarks: input.remarks,
      updated_goals: input.updatedGoals,
    }));
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

function targetValue(goal: GoalSheet["goals"][number]) {
  return goal.targetDate?.slice(0, 10) ?? goal.targetValue?.toString() ?? "";
}

export function ApprovalReviewPage({ employeeId }: { employeeId: string }) {
  const queryClient = useQueryClient();
  const sheetQuery = useQuery({
    queryKey: ["goal-sheet", employeeId],
    queryFn: () => fetchSheet(employeeId),
  });
  const sheet = sheetQuery.data;
  const [remarks, setRemarks] = useState("");
  const [edits, setEdits] = useState<Array<{ id: string; target: string; weightage: number }>>([]);

  useEffect(() => {
    if (sheet && edits.length === 0) {
      setEdits(sheet.goals.map((goal) => ({ id: goal.id, target: targetValue(goal), weightage: numberValue(goal.weightage) })));
    }
  }, [edits.length, sheet]);

  const total = useMemo(() => edits.reduce((sum, goal) => sum + Number(goal.weightage || 0), 0), [edits]);
  const reviewMutation = useMutation({
    mutationFn: (approved: boolean) =>
      reviewSheet({
        sheetId: employeeId,
        approved,
        remarks,
        updatedGoals: edits.map((goal, index) => {
          const original = sheet?.goals[index];
          const isTimeline = Boolean(original?.targetDate);
          return {
            id: goal.id,
            weightage: goal.weightage,
            target_value: isTimeline ? undefined : Number(goal.target),
            target_date: isTimeline ? goal.target : undefined,
          };
        }),
      }),
    onSuccess: (_data, approved) => {
      toast.success(approved ? "Goal sheet approved and locked" : "Goal sheet returned for rework");
      queryClient.invalidateQueries({ queryKey: ["goal-sheet", employeeId] });
      queryClient.invalidateQueries({ queryKey: ["goal-sheets", "team"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to review sheet"),
  });

  if (sheetQuery.isLoading || !sheet) {
    return (
      <div className="portal-page">
        <SkeletonBlock className="page-title-row" />
        <SkeletonBlock />
      </div>
    );
  }

  return (
    <div className="portal-page">
      <div className="page-title-row">
        <div>
          <span>Approval Review</span>
          <h2>{sheet.employee.name}</h2>
          <p>{sheet.employee.department} / {sheet.employee.designation}</p>
        </div>
        <StatusBadge status={sheet.status} />
      </div>

      <div className="review-layout">
        <section className="review-left">
          <PortalCard className="employee-summary">
            <div className="avatar avatar-lg">{initials(sheet.employee.name)}</div>
            <div>
              <h3>{sheet.employee.name}</h3>
              <p>{sheet.employee.email}</p>
              <span>{sheet.employee.department}</span>
            </div>
          </PortalCard>
          {sheet.goals.map((goal) => (
            <article className="review-goal-card" key={goal.id}>
              <span className="thrust-pill" style={{ "--thrust-color": goal.thrustArea.colorHex } as React.CSSProperties}>
                {goal.thrustArea.name}
              </span>
              <h3>{goal.title}</h3>
              <p>{goal.description}</p>
              <div>
                <span>Target: {targetValue(goal)}</span>
                <span>Weightage: {numberValue(goal.weightage)}%</span>
              </div>
            </article>
          ))}
        </section>

        <aside className="review-panel">
          <PortalCard>
            <span className="card-eyebrow">Manager action panel</span>
            <h3>Approve or return sheet</h3>
            <p>Targets and weightages can be edited inline before approval. The total must remain 100%.</p>
            <div className="weightage-review">
              <div>
                <strong>{total}%</strong>
                <span>Total weightage</span>
              </div>
              <ProgressBar value={total} tone={total === 100 ? "success" : "warning"} />
            </div>
            <div className="editable-goal-table">
              {edits.map((goal, index) => (
                <div key={goal.id}>
                  <span>{sheet.goals[index]?.title}</span>
                  <input
                    aria-label="Target"
                    value={goal.target}
                    onChange={(event) =>
                      setEdits((current) => current.map((item) => (item.id === goal.id ? { ...item, target: event.target.value } : item)))
                    }
                  />
                  <input
                    aria-label="Weightage"
                    inputMode="decimal"
                    type="number"
                    value={goal.weightage}
                    onChange={(event) =>
                      setEdits((current) =>
                        current.map((item) => (item.id === goal.id ? { ...item, weightage: Number(event.target.value) } : item))
                      )
                    }
                  />
                </div>
              ))}
            </div>
            <label className="form-field">
              <span>Manager remarks</span>
              <textarea
                placeholder="Required when returning for rework."
                rows={5}
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
              />
            </label>
            <div className="review-actions">
              <Button
                disabled={total !== 100 || sheet.status !== "submitted" || reviewMutation.isPending}
                onClick={() => reviewMutation.mutate(true)}
                type="button"
              >
                <CheckCircle2 size={16} />
                Approve
              </Button>
              <Button
                disabled={remarks.trim().length < 10 || sheet.status !== "submitted" || reviewMutation.isPending}
                onClick={() => reviewMutation.mutate(false)}
                type="button"
                variant="secondary"
              >
                <RotateCcw size={16} />
                Return
              </Button>
            </div>
          </PortalCard>
        </aside>
      </div>
    </div>
  );
}
