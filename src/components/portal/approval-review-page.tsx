"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { getMemberById } from "@/lib/portal-data";
import { Button } from "@/components/ui/button";
import { PortalCard, ProgressBar, StatusBadge } from "@/components/portal/portal-ui";

export function ApprovalReviewPage({ employeeId }: { employeeId: string }) {
  const member = getMemberById(employeeId);
  const [remarks, setRemarks] = useState("");
  const [edits, setEdits] = useState(
    member.goals.map((goal) => ({ id: goal.id, target: goal.target, weightage: goal.weightage }))
  );
  const total = useMemo(() => edits.reduce((sum, goal) => sum + Number(goal.weightage || 0), 0), [edits]);

  return (
    <div className="portal-page">
      <div className="page-title-row">
        <div>
          <span>Approval Review</span>
          <h2>{member.name}</h2>
          <p>{member.department} / {member.designation}</p>
        </div>
        <StatusBadge status={member.status} />
      </div>

      <div className="review-layout">
        <section className="review-left">
          <PortalCard className="employee-summary">
            <div className="avatar avatar-lg">{member.initials}</div>
            <div>
              <h3>{member.name}</h3>
              <p>{member.email}</p>
              <span>{member.manager}</span>
            </div>
          </PortalCard>
          {member.goals.map((goal) => (
            <article className="review-goal-card" key={goal.id}>
              <span className="thrust-pill" style={{ "--thrust-color": goal.color } as React.CSSProperties}>
                {goal.thrustArea}
              </span>
              <h3>{goal.title}</h3>
              <p>{goal.description}</p>
              <div>
                <span>Target: {goal.target}</span>
                <span>Weightage: {goal.weightage}%</span>
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
                  <span>{member.goals[index].title}</span>
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
                disabled={total !== 100}
                onClick={() => toast.success(`${member.name}'s goals approved and locked.`)}
                type="button"
              >
                <CheckCircle2 size={16} />
                Approve
              </Button>
              <Button
                disabled={remarks.trim().length < 10}
                onClick={() => toast.error("Sheet returned for rework with remarks.")}
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
