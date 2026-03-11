"use client";

import { useState, useMemo } from "react";
import Header from "@/components/header";

interface LogRow {
  id: string;
  timestamp: string;
  panelTestIds: string[];
  panelTestNames: string[];
  finalPrice: number | string;
  source: string;
}

export default function LogsClient({ initialLogs }: { initialLogs: LogRow[] }) {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "calculator" | "api">("all");

  const filtered = useMemo(() => {
    let logs = [...initialLogs];

    if (sourceFilter !== "all") {
      logs = logs.filter((l) => l.source === sourceFilter);
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      logs = logs.filter((l) => new Date(l.timestamp) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo + "T23:59:59Z");
      logs = logs.filter((l) => new Date(l.timestamp) <= to);
    }

    if (search) {
      const searchTerms = search.toLowerCase().split(/[\s,]+/).filter(Boolean);

      const scored = logs.map((log) => {
        const allText = [
          ...log.panelTestIds.map((id) => id.toLowerCase()),
          ...log.panelTestNames.map((n) => n.toLowerCase()),
        ];

        let matchCount = 0;
        for (const term of searchTerms) {
          if (allText.some((t) => t.includes(term))) matchCount++;
        }

        const isExact = matchCount === searchTerms.length && log.panelTestIds.length === searchTerms.length;
        const isSuperset = matchCount === searchTerms.length && log.panelTestIds.length > searchTerms.length;

        return {
          log,
          relevance: isExact ? 2 : isSuperset ? 1 : matchCount > 0 ? 0 : -1,
        };
      });

      return scored
        .filter((s) => s.relevance >= 0)
        .sort((a, b) => {
          if (b.relevance !== a.relevance) return b.relevance - a.relevance;
          return new Date(b.log.timestamp).getTime() - new Date(a.log.timestamp).getTime();
        })
        .map((s) => s.log);
    }

    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [initialLogs, search, dateFrom, dateTo, sourceFilter]);

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  return (
    <div>
      <Header title="Logs & Audit Trail" />
      <div className="p-8">
        {/* Filters */}
        <div className="bg-surface-raised rounded-xl border border-border p-5 mb-6 animate-fade-in">
          <div className="flex items-end gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-body font-medium text-text-muted uppercase tracking-wider mb-1.5 block">Search Panel</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                </svg>
                <input type="text" placeholder="Search by test ID or name..." value={search} onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-4 py-2.5 rounded-lg border border-border bg-white text-sm font-body w-full focus:outline-none focus:border-accent transition-colors" />
              </div>
            </div>
            <div>
              <label className="text-xs font-body font-medium text-text-muted uppercase tracking-wider mb-1.5 block">From</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2.5 rounded-lg border border-border text-sm font-body focus:outline-none focus:border-accent transition-colors" />
            </div>
            <div>
              <label className="text-xs font-body font-medium text-text-muted uppercase tracking-wider mb-1.5 block">To</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2.5 rounded-lg border border-border text-sm font-body focus:outline-none focus:border-accent transition-colors" />
            </div>
            <div>
              <label className="text-xs font-body font-medium text-text-muted uppercase tracking-wider mb-1.5 block">Source</label>
              <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value as "all" | "calculator" | "api")}
                className="px-3 py-2.5 rounded-lg border border-border text-sm font-body focus:outline-none focus:border-accent transition-colors appearance-none pr-8 bg-white">
                <option value="all">All</option>
                <option value="calculator">Calculator</option>
                <option value="api">External API</option>
              </select>
            </div>
          </div>
        </div>

        <p className="text-sm text-text-muted font-body mb-4">{filtered.length} log entries</p>

        {/* Table */}
        <div className="bg-surface-raised rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="text-left px-6 py-3 text-xs font-body font-medium text-text-muted uppercase tracking-wider">Timestamp</th>
                <th className="text-left px-6 py-3 text-xs font-body font-medium text-text-muted uppercase tracking-wider">Panel Composition</th>
                <th className="text-left px-6 py-3 text-xs font-body font-medium text-text-muted uppercase tracking-wider">Source</th>
                <th className="text-right px-6 py-3 text-xs font-body font-medium text-text-muted uppercase tracking-wider">Final Price</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log.id} className="border-b border-border last:border-0 table-row-hover">
                  <td className="px-6 py-3.5">
                    <span className="text-sm font-body text-text-primary block">{formatDate(log.timestamp)}</span>
                    <span className="text-xs font-mono text-text-muted">{formatTime(log.timestamp)}</span>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex flex-wrap gap-1.5">
                      {log.panelTestIds.map((id, i) => (
                        <span key={id} className="inline-flex items-center gap-1 text-xs font-body px-2 py-0.5 rounded bg-surface border border-border text-text-secondary">
                          <span className="font-mono text-accent">{id}</span>
                          <span className="text-text-muted hidden xl:inline">{log.panelTestNames[i]}</span>
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={`text-xs font-body font-medium px-2 py-1 rounded-md ${
                      log.source === "calculator" ? "bg-accent-muted text-accent" : "bg-warning-light text-warning"
                    }`}>
                      {log.source === "calculator" ? "Calculator" : "API"}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right font-mono text-sm font-semibold text-text-primary">
                    ${Number(log.finalPrice).toFixed(2)}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-text-muted font-body">
                    No log entries match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
