"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Filter } from "lucide-react";
import { DataToolbar, EmptyState, SkeletonBlock } from "@/components/portal/portal-ui";
import { cn } from "@/lib/utils";
import { apiJson, buildQuery } from "@/lib/api/client";

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

async function fetchAudit(params: { entityType?: string; from?: string; to?: string }) {
  const payload = await apiJson<{ items: AuditEntry[] }>(
    `/api/reports/audit-trail${buildQuery({
      entity_type: params.entityType,
      from: params.from,
      to: params.to,
      limit: 100,
    })}`
  );
  return payload.items ?? [];
}

export function AuditPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const entityType = searchParams.get("entity_type") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const query = useQuery({
    queryKey: ["audit-trail", entityType, from, to],
    queryFn: () => fetchAudit({ entityType, from, to }),
  });
  const entries = (query.data ?? []).filter((entry) => {
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    return [entry.action, entry.entityType, entry.actor.name, entry.reason ?? ""]
      .some((value) => value.toLowerCase().includes(needle));
  });

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(params.size ? `${pathname}?${params.toString()}` : pathname);
  }

  return (
    <div className="portal-page">
      <div className="page-title-row">
        <div>
          <span>Audit Trail</span>
          <h2>Immutable governance log</h2>
          <p>Newest first, with readable before-and-after diffs for post-lock changes.</p>
        </div>
      </div>

      <DataToolbar>
        <label>
          <Filter size={16} />
          <input
            placeholder="Filter action or user"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setFilter("search", event.target.value);
            }}
          />
        </label>
        <select value={entityType} onChange={(event) => setFilter("entity_type", event.target.value)}>
          <option value="">All entity types</option>
          <option value="goal">goal</option>
          <option value="goal_sheet">goal_sheet</option>
          <option value="goal_cycle">goal_cycle</option>
          <option value="thrust_area">thrust_area</option>
          <option value="user">user</option>
          <option value="escalation_rule">escalation_rule</option>
        </select>
        <input aria-label="From date" type="date" value={from} onChange={(event) => setFilter("from", event.target.value)} />
        <input aria-label="To date" type="date" value={to} onChange={(event) => setFilter("to", event.target.value)} />
      </DataToolbar>

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
