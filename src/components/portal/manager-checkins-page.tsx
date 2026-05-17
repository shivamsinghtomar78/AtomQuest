"use client";

import { toast } from "sonner";
import { MessageSquareText, Send } from "lucide-react";
import { getMemberById, quarters } from "@/lib/portal-data";
import { Button } from "@/components/ui/button";
import { PortalCard, ScoreChip } from "@/components/portal/portal-ui";

export function ManagerCheckinsPage({ sheetId }: { sheetId: string }) {
  const member = getMemberById(sheetId);

  return (
    <div className="portal-page">
      <div className="page-title-row">
        <div>
          <span>Manager Check-ins</span>
          <h2>{member.name}</h2>
          <p>Planned target vs actual achievement across quarters.</p>
        </div>
      </div>

      <div className="portal-table-wrap">
        <table className="portal-table score-table">
          <thead>
            <tr>
              <th>Goal</th>
              <th>Target</th>
              {quarters.map((quarter) => (
                <th key={quarter}>{quarter} Actual / Score</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {member.goals.map((goal) => (
              <tr key={goal.id}>
                <td>
                  <strong>{goal.title}</strong>
                  <small>{goal.thrustArea}</small>
                </td>
                <td>{goal.target}</td>
                {quarters.map((quarter) => (
                  <td key={quarter}>
                    <span>{goal.updates[quarter].actual}</span>
                    <ScoreChip score={goal.updates[quarter].score} />
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
        <div className="comment-grid">
          <label className="form-field">
            <span>Overall Comment</span>
            <textarea placeholder="Summarize progress, risks, and decisions." rows={4} />
          </label>
          <label className="form-field">
            <span>Key Observations</span>
            <textarea placeholder="What stood out this quarter?" rows={4} />
          </label>
          <label className="form-field">
            <span>Areas of Improvement</span>
            <textarea placeholder="What should improve before the next quarter?" rows={4} />
          </label>
          <label className="form-field">
            <span>Support Required</span>
            <textarea placeholder="Any unblockers or resources required?" rows={4} />
          </label>
        </div>
        <Button onClick={() => toast.success("Check-in comment submitted and employee notified.")} type="button">
          <Send size={16} />
          Submit Check-in Comment
        </Button>
      </PortalCard>
    </div>
  );
}
