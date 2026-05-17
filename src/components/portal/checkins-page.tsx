"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";
import { computeProgressScore } from "@/lib/scoring";
import { demoGoals, quarters, uomLabel, type Quarter, type UpdateStatus } from "@/lib/portal-data";
import { Button } from "@/components/ui/button";
import { PortalCard, ScoreChip, StatusBadge } from "@/components/portal/portal-ui";

export function CheckinsPage() {
  const [activeGoalIndex, setActiveGoalIndex] = useState(0);
  const [quarter, setQuarter] = useState<Quarter>("Q2");
  const [actualValue, setActualValue] = useState("91");
  const [actualDate, setActualDate] = useState("2026-03-28");
  const [zeroActual, setZeroActual] = useState(true);
  const [status, setStatus] = useState<UpdateStatus>("on_track");
  const activeGoal = demoGoals[activeGoalIndex];

  const score = useMemo(() => {
    if (activeGoal.uomType === "timeline") {
      return computeProgressScore({
        uomType: "timeline",
        targetDate: activeGoal.target,
        actualDate,
      });
    }
    if (activeGoal.uomType === "zero") {
      return computeProgressScore({
        uomType: "zero",
        actualValue: zeroActual ? 0 : 1,
      });
    }
    const target = Number(activeGoal.target.replace(/[^0-9.]/g, "")) || 100;
    return computeProgressScore({
      uomType: activeGoal.uomType,
      targetValue: target,
      actualValue: Number(actualValue),
    });
  }, [activeGoal, actualDate, actualValue, zeroActual]);

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
            {item === "Q3" || item === "Q4" ? <span>Opens later</span> : <span>Open</span>}
          </button>
        ))}
      </div>

      <div className="checkin-layout">
        <PortalCard className="checkin-goal-panel">
          <span className="thrust-pill" style={{ "--thrust-color": activeGoal.color } as React.CSSProperties}>
            {activeGoal.thrustArea}
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
              <dd>{activeGoal.target}</dd>
            </div>
            <div>
              <dt>Weightage</dt>
              <dd>{activeGoal.weightage}%</dd>
            </div>
          </dl>
          <StatusBadge status={activeGoal.status} />
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
              disabled={activeGoalIndex === demoGoals.length - 1}
              onClick={() => setActiveGoalIndex((index) => Math.min(demoGoals.length - 1, index + 1))}
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
            <span className="window-chip">Window open</span>
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
            <textarea placeholder="Add context, blockers, or support needed." rows={5} />
          </label>

          <div className="score-preview">
            <span>Live score preview</span>
            <ScoreChip score={score === null ? null : Math.round(score)} />
          </div>

          <Button onClick={() => toast.success(`${quarter} achievement saved.`)} type="button">
            <Save size={16} />
            Save Update
          </Button>
        </PortalCard>
      </div>
    </div>
  );
}
