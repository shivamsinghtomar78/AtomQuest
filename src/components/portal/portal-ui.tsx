import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { scoreTone, statusLabel, type SheetStatus, type UpdateStatus } from "@/lib/portal-data";

export function StatusBadge({
  status,
  className,
}: {
  status: SheetStatus | UpdateStatus;
  className?: string;
}) {
  return (
    <span className={cn("portal-badge", `portal-badge-${status}`, className)}>
      {statusLabel(status)}
    </span>
  );
}

export function ScoreChip({ score }: { score: number | null }) {
  const tone = scoreTone(score);

  return (
    <span className={cn("score-chip", `score-chip-${tone}`)}>
      {score === null ? "Pending" : `${score}%`}
    </span>
  );
}

export function ProgressBar({
  value,
  tone = "blue",
}: {
  value: number;
  tone?: "blue" | "success" | "warning" | "danger" | "purple";
}) {
  return (
    <div className="portal-progress" aria-label={`${Math.round(value)} percent`}>
      <span className={`portal-progress-fill portal-progress-${tone}`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

export function PortalCard({
  children,
  className,
  ...props
}: {
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn("portal-card", className)} {...props}>
      {children}
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="portal-section-header">
      <div>
        {eyebrow ? <span>{eyebrow}</span> : null}
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-art" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("portal-skeleton", className)} />;
}
