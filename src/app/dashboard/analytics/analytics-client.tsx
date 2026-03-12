"use client";

import { useState, useMemo, useEffect } from "react";
import Header from "@/components/header";
import { analyzePanel } from "@/lib/db/actions/analytics-actions";
import type { PricingResult, AnalyticsResult } from "@/lib/pricing";

interface PanelWithTests {
  id: string;
  name: string;
  panelTests: { test: { id: string; testId: string; name: string; reagentCost: number | string; listPrice: number | string } }[];
}

interface OrgSettings {
  overheadCost: number;
  panelsPerDay: number;
  futureOverheadCost: number;
  futurePanelsPerDay: number;
}

export default function AnalyticsClient({
  initialPanels,
  orgSettings,
}: {
  initialPanels: PanelWithTests[];
  orgSettings: OrgSettings | null;
}) {
  const [selectedPanelId, setSelectedPanelId] = useState(initialPanels[0]?.id ?? "");
  const [currentOverhead, setCurrentOverhead] = useState(String(orgSettings?.overheadCost ?? 2500));
  const [currentVolume, setCurrentVolume] = useState(String(orgSettings?.panelsPerDay ?? 50));
  const [futureOverhead, setFutureOverhead] = useState(String(orgSettings?.futureOverheadCost ?? 3500));
  const [futureVolume, setFutureVolume] = useState(String(orgSettings?.futurePanelsPerDay ?? 80));
  const [pricingResult, setPricingResult] = useState<PricingResult | null>(null);
  const [analyticsResult, setAnalyticsResult] = useState<AnalyticsResult | null>(null);

  useEffect(() => {
    if (!selectedPanelId) return;
    analyzePanel({
      panelId: selectedPanelId,
      currentDailyOverhead: parseFloat(currentOverhead) || 0,
      currentPanelsPerDay: parseFloat(currentVolume) || 0,
      futureDailyOverhead: parseFloat(futureOverhead) || 0,
      futurePanelsPerDay: parseFloat(futureVolume) || 0,
    }).then((res) => {
      if (res.success && "pricingResult" in res) {
        setPricingResult(res.pricingResult);
        setAnalyticsResult(res.analyticsResult);
      }
    });
  }, [selectedPanelId, currentOverhead, currentVolume, futureOverhead, futureVolume]);

  if (!pricingResult || !analyticsResult) {
    return (
      <div>
        <Header title="Analytics" />
        <div className="p-8">
          {initialPanels.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-text-muted font-body">No panels defined yet. Create a panel first.</p>
            </div>
          ) : (
            <p className="text-text-muted font-body">Loading...</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Analytics" />
      <div className="p-8 space-y-6">
        {/* Panel Selector + Inputs */}
        <div className="grid grid-cols-12 gap-6 animate-fade-in">
          <div className="col-span-4 bg-surface-raised rounded-xl border border-border p-5">
            <h3 className="font-display font-semibold text-sm text-text-primary mb-4">Select Panel</h3>
            <div className="space-y-2">
              {initialPanels.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPanelId(p.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                    selectedPanelId === p.id
                      ? "border-accent bg-accent-muted"
                      : "border-border hover:border-border-strong"
                  }`}
                >
                  <span className="text-sm font-body font-medium text-text-primary block">{p.name}</span>
                  <span className="text-xs font-mono text-text-muted">{p.panelTests.map((pt) => pt.test.testId).join(", ")}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="col-span-8 bg-surface-raised rounded-xl border border-border p-5">
            <h3 className="font-display font-semibold text-sm text-text-primary mb-4">Overhead & Volume Inputs</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-accent" />
                  <span className="text-xs font-body font-semibold text-text-secondary uppercase tracking-wider">Current</span>
                </div>
                <div>
                  <label className="text-xs font-body text-text-muted mb-1 block">Daily Overhead Cost ($)</label>
                  <input type="number" value={currentOverhead} onChange={(e) => setCurrentOverhead(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-border text-sm font-mono focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="text-xs font-body text-text-muted mb-1 block">Panels Processed / Day</label>
                  <input type="number" value={currentVolume} onChange={(e) => setCurrentVolume(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-border text-sm font-mono focus:outline-none focus:border-accent" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-warning" />
                  <span className="text-xs font-body font-semibold text-text-secondary uppercase tracking-wider">Projected</span>
                </div>
                <div>
                  <label className="text-xs font-body text-text-muted mb-1 block">Daily Overhead Cost ($)</label>
                  <input type="number" value={futureOverhead} onChange={(e) => setFutureOverhead(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-border text-sm font-mono focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="text-xs font-body text-text-muted mb-1 block">Panels Processed / Day</label>
                  <input type="number" value={futureVolume} onChange={(e) => setFutureVolume(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-border text-sm font-mono focus:outline-none focus:border-accent" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profitability Forecast */}
        <div className="grid grid-cols-4 gap-4 animate-fade-in stagger-1 opacity-0">
          <MetricCard label="Panel Price" value={`$${analyticsResult.panelPrice.toFixed(2)}`} sub="Revenue per panel" color="accent" />
          <MetricCard label="Current Margin" value={`$${analyticsResult.currentGrossMargin.toFixed(2)}`} sub={`${analyticsResult.currentGrossMarginPct.toFixed(1)}% margin`} color={analyticsResult.currentProfitable ? "success" : "danger"} />
          <MetricCard label="Projected Margin" value={`$${analyticsResult.futureGrossMargin.toFixed(2)}`} sub={`${analyticsResult.futureGrossMarginPct.toFixed(1)}% margin`} color={analyticsResult.futureProfitable ? "success" : "danger"} />
          <MetricCard label="Overhead / Panel" value={`$${analyticsResult.currentOverheadPerPanel.toFixed(2)}`} sub={`Projected: $${analyticsResult.futureOverheadPerPanel.toFixed(2)}`} color="warning" />
        </div>

        {/* Detailed Breakdown */}
        <div className="grid grid-cols-12 gap-6 animate-fade-in stagger-2 opacity-0">
          <div className="col-span-7 bg-surface-raised rounded-xl border border-border">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-display font-semibold text-sm text-text-primary">Pricing Algorithm Breakdown</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="text-left px-5 py-2.5 text-xs font-body font-medium text-text-muted uppercase">Test</th>
                  <th className="text-left px-5 py-2.5 text-xs font-body font-medium text-text-muted uppercase">Role</th>
                  <th className="text-right px-5 py-2.5 text-xs font-body font-medium text-text-muted uppercase">Reagent</th>
                  <th className="text-right px-5 py-2.5 text-xs font-body font-medium text-text-muted uppercase">Overhead</th>
                  <th className="text-right px-5 py-2.5 text-xs font-body font-medium text-text-muted uppercase">Price</th>
                </tr>
              </thead>
              <tbody>
                {pricingResult.tests.map((d) => (
                  <tr key={d.testId} className="border-b border-border last:border-0">
                    <td className="px-5 py-3">
                      <span className="text-sm font-body text-text-primary">{d.testName}</span>
                      <span className="text-xs font-mono text-text-muted ml-2">{d.testId}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-body font-semibold px-2 py-0.5 rounded ${d.role === "anchor" ? "badge-anchor" : "badge-addon"}`}>
                        {d.role === "anchor" ? "ANCHOR" : "ADD-ON"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-sm text-text-secondary">${d.reagentCost.toFixed(2)}</td>
                    <td className="px-5 py-3 text-right font-mono text-sm text-text-secondary">${d.marginalOverhead.toFixed(2)}</td>
                    <td className="px-5 py-3 text-right font-mono text-sm font-semibold text-text-primary">${d.finalPrice.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="col-span-5 space-y-4">
            <div className="bg-surface-raised rounded-xl border border-border p-5">
              <h3 className="font-display font-semibold text-sm text-text-primary mb-4">Cost Summary</h3>
              <div className="space-y-3">
                <CostRow label="Total Reagent Cost" value={pricingResult.totalReagentCost} />
                <CostRow label="Total Marginal Overhead" value={pricingResult.totalOverhead} />
                <CostRow label="Current Allocated Overhead" value={analyticsResult.currentOverheadPerPanel} />
                <div className="border-t border-border pt-3">
                  <CostRow label="Current Total Cost" value={analyticsResult.currentTotalCost} bold />
                </div>
                <div className="border-t border-border pt-3">
                  <CostRow label="Projected Total Cost" value={analyticsResult.futureTotalCost} bold />
                </div>
              </div>
            </div>

            <div className="bg-surface-raised rounded-xl border border-border p-5">
              <h3 className="font-display font-semibold text-sm text-text-primary mb-4">Profitability Comparison</h3>
              <div className="space-y-4">
                <ProfitBar label="Current" margin={analyticsResult.currentGrossMarginPct} profitable={analyticsResult.currentProfitable} />
                <ProfitBar label="Projected" margin={analyticsResult.futureGrossMarginPct} profitable={analyticsResult.futureProfitable} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  const colorMap: Record<string, string> = { accent: "text-accent", success: "text-success", danger: "text-danger", warning: "text-warning" };
  return (
    <div className="bg-surface-raised rounded-xl border border-border p-5">
      <p className="text-xs font-body font-medium text-text-muted uppercase tracking-wider mb-2">{label}</p>
      <p className={`font-mono text-2xl font-bold ${colorMap[color] || "text-text-primary"}`}>{value}</p>
      <p className="text-xs font-body text-text-muted mt-1">{sub}</p>
    </div>
  );
}

function CostRow({ label, value, bold = false }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-sm font-body ${bold ? "font-semibold text-text-primary" : "text-text-secondary"}`}>{label}</span>
      <span className={`font-mono text-sm ${bold ? "font-semibold text-text-primary" : "text-text-secondary"}`}>${value.toFixed(2)}</span>
    </div>
  );
}

function ProfitBar({ label, margin, profitable }: { label: string; margin: number; profitable: boolean }) {
  const width = Math.min(Math.abs(margin), 100);
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm font-body text-text-secondary">{label}</span>
        <span className={`font-mono text-sm font-semibold ${profitable ? "text-success" : "text-danger"}`}>{margin.toFixed(1)}%</span>
      </div>
      <div className="w-full h-2.5 bg-surface rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${profitable ? "bg-success" : "bg-danger"}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
