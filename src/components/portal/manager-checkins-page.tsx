"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageSquareText, Send } from "lucide-react";
import { quarters } from "@/lib/portal-data";
import { Button } from "@/components/ui/button";
import { PortalCard, ScoreChip, SkeletonBlock, StatusTimeline } from "@/components/portal/portal-ui";
import { apiJson, jsonRequest } from "@/lib/api/client";

type GoalSheet = {
  id: string;
  employee: { name: string; department: string | null; designation: string | null };
  goals: Array<{
    id: string;
    title: string;
    targetValue: string | number | null;
    targetDate: string | null;
    uomType: string;
    thrustArea: { name: string };
    quarterlyUpdates: Array<{
      quarter: string;
      actualValue: string | number | null;
      actualDate: string | null;
      actualZero: boolean | null;
      computedScore: string | number | null;
    }>;
  }>;
  checkinComments: Array<{
    quarter: "Q1" | "Q2" | "Q3" | "Q4";
    overallComment: string;
    keyObservations: string | null;
    areasOfImprovement: string | null;
    supportRequired: string | null;
    checkinDate: string;
  }>;
};

async function fetchSheet(sheetId: string) {
  return apiJson<GoalSheet>(`/api/goal-sheets/${sheetId}`);
}

function targetFor(goal: GoalSheet["goals"][number]) {
  return goal.targetDate?.slice(0, 10) ?? goal.targetValue?.toString() ?? "0";
}

function actualFor(goal: GoalSheet["goals"][number], quarter: string) {
  const update = goal.quarterlyUpdates.find((item) => item.quarter === quarter);
  if (!update) return "Pending";
  if (update.actualDate) return update.actualDate.slice(0, 10);
  if (update.actualZero !== null) return update.actualZero ? "0" : "Incident";
  return update.actualValue?.toString() ?? "Pending";
}

function scoreFor(goal: GoalSheet["goals"][number], quarter: string) {
  const score = goal.quarterlyUpdates.find((item) => item.quarter === quarter)?.computedScore;
  if (score === null || score === undefined) return null;
  const parsed = Number(score);
  return Number.isFinite(parsed) ? parsed : null;
}

export function ManagerCheckinsPage({ sheetId }: { sheetId: string }) {
  const queryClient = useQueryClient();
  const [quarter, setQuarter] = useState<"Q1" | "Q2" | "Q3" | "Q4">("Q2");
  const [overallComment, setOverallComment] = useState("");
  const [keyObservations, setKeyObservations] = useState("");
  const [areasOfImprovement, setAreasOfImprovement] = useState("");
  const [supportRequired, setSupportRequired] = useState("");
  const sheetQuery = useQuery({ queryKey: ["goal-sheet", sheetId], queryFn: () => fetchSheet(sheetId) });
  const sheet = sheetQuery.data;
  const existingComment = sheet?.checkinComments.find((comment) => comment.quarter === quarter);

  useEffect(() => {
    setOverallComment(existingComment?.overallComment ?? "");
    setKeyObservations(existingComment?.keyObservations ?? "");
    setAreasOfImprovement(existingComment?.areasOfImprovement ?? "");
    setSupportRequired(existingComment?.supportRequired ?? "");
  }, [existingComment, quarter]);

  const saveComment = useMutation({
    mutationFn: async () => {
      return apiJson("/api/checkin-comments", jsonRequest("POST", {
          sheet_id: sheetId,
          quarter,
          overall_comment: overallComment,
          key_observations: keyObservations,
          areas_of_improvement: areasOfImprovement,
          support_required: supportRequired,
        }));
    },
    onSuccess: () => {
      toast.success("Check-in comment submitted and employee notified");
      queryClient.invalidateQueries({ queryKey: ["goal-sheet", sheetId] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to submit check-in"),
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
          <span>Manager Check-ins</span>
          <h2>{sheet.employee.name}</h2>
          <p>Planned target vs actual achievement across quarters.</p>
        </div>
      </div>

      <div className="portal-table-wrap">
        <table className="portal-table score-table">
          <thead>
            <tr>
              <th>Goal</th>
              <th>Target</th>
              {quarters.map((item) => (
                <th key={item}>{item} Actual / Score</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sheet.goals.map((goal) => (
              <tr key={goal.id}>
                <td>
                  <strong>{goal.title}</strong>
                  <small>{goal.thrustArea.name}</small>
                </td>
                <td>{targetFor(goal)}</td>
                {quarters.map((item) => (
                  <td key={item}>
                    <span>{actualFor(goal, item)}</span>
                    <ScoreChip score={scoreFor(goal, item)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PortalCard className="checkin-comment-form">
        <div className="card-title-row">
          <div>
            <span className="card-eyebrow">Structured feedback</span>
            <h3>Check-in comment</h3>
          </div>
          <MessageSquareText size={22} />
        </div>
        <label className="form-field">
          <span>Quarter</span>
          <select value={quarter} onChange={(event) => setQuarter(event.target.value as typeof quarter)}>
            {quarters.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <div className="comment-grid">
          <label className="form-field">
            <span>Overall Comment</span>
            <textarea placeholder="Summarize progress, risks, and decisions." rows={4} value={overallComment} onChange={(event) => setOverallComment(event.target.value)} />
          </label>
          <label className="form-field">
            <span>Key Observations</span>
            <textarea placeholder="What stood out this quarter?" rows={4} value={keyObservations} onChange={(event) => setKeyObservations(event.target.value)} />
          </label>
          <label className="form-field">
            <span>Areas of Improvement</span>
            <textarea placeholder="What should improve before the next quarter?" rows={4} value={areasOfImprovement} onChange={(event) => setAreasOfImprovement(event.target.value)} />
          </label>
          <label className="form-field">
            <span>Support Required</span>
            <textarea placeholder="Any unblockers or resources required?" rows={4} value={supportRequired} onChange={(event) => setSupportRequired(event.target.value)} />
          </label>
        </div>
        <Button disabled={overallComment.trim().length < 20 || saveComment.isPending} onClick={() => saveComment.mutate()} type="button">
          <Send size={16} />
          {saveComment.isPending ? "Submitting..." : existingComment ? "Update Check-in Comment" : "Submit Check-in Comment"}
        </Button>
      </PortalCard>

      <PortalCard>
        <div className="card-title-row">
          <div>
            <span className="card-eyebrow">Feedback history</span>
            <h3>Quarterly manager notes</h3>
          </div>
        </div>
        <StatusTimeline
          items={quarters.map((item) => {
            const comment = sheet.checkinComments.find((entry) => entry.quarter === item);
            return {
              label: item,
              complete: Boolean(comment),
              detail: comment
                ? `${comment.overallComment} (${new Date(comment.checkinDate).toLocaleDateString()})`
                : "No structured feedback saved yet.",
            };
          })}
        />
      </PortalCard>
    </div>
  );
}
