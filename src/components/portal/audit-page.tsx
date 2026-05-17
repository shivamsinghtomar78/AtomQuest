"use client";

import { useState } from "react";
import { ChevronDown, Filter } from "lucide-react";
import { auditEntries } from "@/lib/portal-data";
import { cn } from "@/lib/utils";

export function AuditPage() {
  const [expanded, setExpanded] = useState<string | null>("audit-1");

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

      <div className="audit-timeline">
        {auditEntries.map((entry) => (
          <article className={`audit-entry audit-${entry.tone}`} key={entry.id}>
            <div className="audit-dot" />
            <button onClick={() => setExpanded(expanded === entry.id ? null : entry.id)} type="button">
              <div>
                <span>{entry.action}</span>
                <h3>{entry.summary}</h3>
                <p>{entry.actor} changed {entry.entity}</p>
                <time>{entry.timestamp}</time>
              </div>
              <ChevronDown className={cn(expanded === entry.id && "is-open")} size={18} />
            </button>
            {expanded === entry.id ? (
              <div className="audit-diff">
                <div>
                  <span>Previous value</span>
                  <code>{entry.before}</code>
                </div>
                <div>
                  <span>New value</span>
                  <code>{entry.after}</code>
                </div>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
