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

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-title-row">
      <div>
        {eyebrow ? <span>{eyebrow}</span> : null}
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </div>
  );
}

export function MetricCard({
  icon,
  label,
  value,
  detail,
}: {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <PortalCard className="mini-dashboard-card">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <p>{detail}</p> : null}
    </PortalCard>
  );
}

export function DataToolbar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("filter-bar", className)}>{children}</div>;
}

export function DataTableShell({
  children,
  empty,
}: {
  children: ReactNode;
  empty?: boolean;
}) {
  return empty ? <>{children}</> : <div className="portal-table-wrap">{children}</div>;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger,
  loading,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="portal-modal-layer" role="presentation">
      <button aria-label={cancelLabel} className="portal-modal-backdrop" onClick={onCancel} type="button" />
      <div aria-modal="true" className="confirm-dialog" role="alertdialog">
        <h3>{title}</h3>
        <p>{description}</p>
        <div className="modal-footer">
          <button className="aq-button aq-button-secondary aq-button-md" onClick={onCancel} type="button">
            {cancelLabel}
          </button>
          <button
            className={cn("aq-button aq-button-md", danger ? "aq-button-danger" : "aq-button-primary")}
            disabled={loading}
            onClick={onConfirm}
            type="button"
          >
            {loading ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function FormField({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children}
      {hint ? <em>{hint}</em> : null}
      {error ? <small>{error}</small> : null}
    </label>
  );
}

export function InlineValidation({
  tone = "info",
  children,
}: {
  tone?: "info" | "warning" | "danger" | "success";
  children: ReactNode;
}) {
  return <div className={cn("inline-validation", `inline-validation-${tone}`)}>{children}</div>;
}

export function StatusTimeline({
  items,
}: {
  items: Array<{ label: string; detail?: ReactNode; complete?: boolean }>;
}) {
  return (
    <ol className="status-timeline">
      {items.map((item) => (
        <li className={cn(item.complete && "is-complete")} key={item.label}>
          <span aria-hidden="true" />
          <div>
            <strong>{item.label}</strong>
            {item.detail ? <p>{item.detail}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function ResponsivePanel({
  children,
  className,
  ...props
}: {
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn("responsive-panel", className)} {...props}>
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
