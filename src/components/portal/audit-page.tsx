"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Filter } from "lucide-react";
import { EmptyState, SkeletonBlock } from "@/components/portal/portal-ui";
import { cn } from "@/lib/utils";

type AuditEntry = {
  id: string;
  action: string;
  entityType: string;
  reason: string | null;
  previousValue: unknown;
  newValue: unknown;
  createdAt: string;
  actor: { name: string; role: string };
  readable_diff: Array<{ field: string; from: unknown; to: unknown }>;
};

async function fetchAudit() {
  const response = await fetch("/api/reports/audit-trail");
  const payload = await response.json();
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message ?? "Unable to load audit log");
  }
  return (payload.data?.items ?? []) as AuditEntry[];
}

export function AuditPage() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const query = useQuery({ queryKey: ["audit-trail"], queryFn: fetchAudit });
  const entries = query.data ?? [];

  return (
    <div className="portal-page">
      <div className="page-title-row">
        <div>
          <span>Audit Trail</span>
          <h2>Immutable governance log</h2>
          <p>Newest first, with readable before-and-after diffs for post-lock changes.</p>
        </div>
      </div>

      <div className="filter-bar">
        <label>
          <Filter size={16} />
          <input placeholder="Filter action or user" />
        </label>
        <select><option>All entity types</option><option>goal</option><option>goal_sheet</option></select>
        <input type="date" />
        <input type="date" />
      </div>

      {query.isLoading ? (
        <SkeletonBlock />
      ) : entries.length ? (
        <div className="audit-timeline">
          {entries.map((entry) => (
            <article className="audit-entry audit-info" key={entry.id}>
              <div className="audit-dot" />
              <button onClick={() => setExpanded(expanded === entry.id ? null : entry.id)} type="button">
                <div>
                  <span>{entry.action}</span>
                  <h3>{entry.reason ?? `${entry.entityType} updated`}</h3>
                  <p>{entry.actor.name} changed {entry.entityType}</p>
                  <time>{new Date(entry.createdAt).toLocaleString()}</time>
                </div>
                <ChevronDown className={cn(expanded === entry.id && "is-open")} size={18} />
              </button>
              {expanded === entry.id ? (
                <div className="audit-diff">
                  <div>
                    <span>Previous value</span>
                    <code>{JSON.stringify(entry.previousValue ?? {}, null, 2)}</code>
                  </div>
                  <div>
                    <span>New value</span>
                    <code>{JSON.stringify(entry.newValue ?? {}, null, 2)}</code>
                  </div>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          description="No post-lock changes have been made in this cycle."
          title="Clean audit log"
        />
      )}
    </div>
  );
}
