// components/AuditLogPanel.js
// Admin-only audit trail viewer. Reads /api/admin/audit-logs and renders a
// compact, mobile-first list of mutating admin actions (who · what · when).
// Records carry actor_role today; actor_label slots in once RBAC adds real users.
"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Search, ScrollText, ChevronDown } from "lucide-react";

// Entities the trail can filter by — keep in sync with the `entity` values
// emitted by the instrumented routes in app/api/admin/**.
const ENTITIES = [
  { value: "all", label: "All activity" },
  { value: "registration", label: "Registrations" },
  { value: "event", label: "Events" },
  { value: "category", label: "Ticket Tiers" },
  { value: "media", label: "Media" },
  { value: "checkpoint", label: "Checkpoints" },
  { value: "form_field", label: "Form Fields" },
  { value: "highlight", label: "Highlights" },
  { value: "faq", label: "FAQs" },
  { value: "schedule", label: "Schedule" },
];

const ENTITY_BADGE = {
  registration: "bg-blue-100 text-blue-700 border-blue-200",
  event: "bg-purple-100 text-purple-700 border-purple-200",
  category: "bg-amber-100 text-amber-800 border-amber-300",
  media: "bg-pink-100 text-pink-700 border-pink-200",
  checkpoint: "bg-teal-100 text-teal-700 border-teal-200",
  form_field: "bg-indigo-100 text-indigo-700 border-indigo-200",
  highlight: "bg-orange-100 text-orange-700 border-orange-200",
  faq: "bg-cyan-100 text-cyan-700 border-cyan-200",
  schedule: "bg-lime-100 text-lime-700 border-lime-200",
};

function timeAgo(iso) {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export default function AuditLogPanel() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entity, setEntity] = useState("all");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (entity !== "all") params.set("entity", entity);
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      setLogs(res.ok ? data.logs || [] : []);
    } finally {
      setLoading(false);
    }
  }, [entity, q]);

  // Reload when the entity filter changes; debounce the free-text search.
  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <ScrollText className="w-5 h-5 text-neutral-500" />
          <h2 className="text-lg font-bold text-neutral-900">Audit Log</h2>
          <span className="text-xs text-neutral-400 ml-1">Every admin change is recorded here.</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search actions…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-orange-600"
            />
          </div>
          <select
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            className="px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-orange-600"
          >
            {ENTITIES.map((e) => (
              <option key={e.value} value={e.value}>{e.label}</option>
            ))}
          </select>
          <button
            onClick={load}
            className="flex items-center justify-center gap-2 bg-neutral-900 hover:bg-orange-600 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm divide-y divide-neutral-100">
        {loading ? (
          <div className="px-6 py-12 text-center text-neutral-400 text-sm">Loading activity…</div>
        ) : logs.length === 0 ? (
          <div className="px-6 py-12 text-center text-neutral-400 text-sm">No activity recorded yet.</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="px-4 sm:px-5 py-3.5">
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 flex-shrink-0 inline-flex items-center py-0.5 px-2 rounded-full text-[11px] font-bold border ${ENTITY_BADGE[log.entity] || "bg-neutral-100 text-neutral-600 border-neutral-200"}`}>
                  {log.entity || "system"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-neutral-900 break-words">{log.summary || log.action}</p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs text-neutral-500">
                    <span className={`font-semibold uppercase tracking-wide ${log.actor_role === "admin" ? "text-orange-600" : "text-neutral-500"}`}>
                      {log.actor_label || log.actor_role}
                    </span>
                    <span>·</span>
                    <span className="font-mono text-neutral-400">{log.action}</span>
                    <span>·</span>
                    <span title={new Date(log.created_at).toLocaleString("en-IN")}>{timeAgo(log.created_at)}</span>
                    {log.ip && <><span>·</span><span className="text-neutral-400">{log.ip}</span></>}
                  </div>
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <details className="mt-1.5 group">
                      <summary className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-600 cursor-pointer select-none list-none">
                        <ChevronDown className="w-3 h-3 transition-transform group-open:rotate-180" /> details
                      </summary>
                      <pre className="mt-1.5 text-[11px] bg-neutral-50 border border-neutral-200 rounded-lg p-2.5 overflow-x-auto text-neutral-600">{JSON.stringify(log.metadata, null, 2)}</pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      {!loading && logs.length > 0 && (
        <p className="text-xs text-neutral-400 text-center">Showing the {logs.length} most recent action(s).</p>
      )}
    </div>
  );
}
