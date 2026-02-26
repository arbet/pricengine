"use client";

import { useState, useMemo } from "react";
import Header from "@/components/header";
import { useAuth } from "@/context/auth-context";
import { labTests, LabTest } from "@/data/mock-data";
import { calculatePanelPrice, PricingResult } from "@/lib/pricing";

export default function CalculatorPage() {
  const { orgId } = useAuth();
  const orgTests = useMemo(() => labTests.filter((t) => t.orgId === (orgId || "org-1")), [orgId]);

  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<PricingResult | null>(null);

  const filteredTests = useMemo(() => {
    if (!search) return orgTests;
    const q = search.toLowerCase();
    return orgTests.filter((t) => t.id.toLowerCase().includes(q) || t.name.toLowerCase().includes(q));
  }, [orgTests, search]);

  const selectedTests = useMemo(
    () => orgTests.filter((t) => selectedIds.has(t.id)),
    [orgTests, selectedIds]
  );

  const toggleTest = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
    setResult(null);
  };

  const removeTest = (id: string) => {
    const next = new Set(selectedIds);
    next.delete(id);
    setSelectedIds(next);
    setResult(null);
  };

  const handleCalculate = () => {
    if (selectedTests.length === 0) return;
    setResult(calculatePanelPrice(selectedTests));
  };

  const clearAll = () => {
    setSelectedIds(new Set());
    setResult(null);
  };

  return (
    <div>
      <Header title="Pricing Calculator" />
      <div className="p-8">
        <div className="grid grid-cols-12 gap-6">
          {/* Left: Test picker */}
          <div className="col-span-5 animate-fade-in">
            <div className="bg-surface-raised rounded-xl border border-border overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="font-display font-semibold text-sm text-text-primary mb-3">Select Tests</h3>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search tests..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 pr-4 py-2 rounded-lg border border-border bg-surface text-sm font-body w-full focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
              </div>
              <div className="max-h-[480px] overflow-y-auto">
                {filteredTests.map((test) => {
                  const isSelected = selectedIds.has(test.id);
                  return (
                    <button
                      key={test.id}
                      onClick={() => toggleTest(test.id)}
                      className={`w-full text-left px-5 py-3 border-b border-border last:border-0 flex items-center justify-between transition-colors ${
                        isSelected ? "bg-accent-muted" : "hover:bg-surface"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                          isSelected ? "bg-accent border-accent" : "border-border-strong"
                        }`}>
                          {isSelected && (
                            <svg width="12" height="12" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <span className="text-sm font-body text-text-primary block">{test.name}</span>
                          <span className="text-xs font-mono text-text-muted">{test.id}</span>
                        </div>
                      </div>
                      <span className="font-mono text-sm text-text-secondary">${test.listPrice.toFixed(2)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Panel builder + results */}
          <div className="col-span-7 space-y-6 animate-fade-in stagger-2 opacity-0">
            {/* Selected panel */}
            <div className="bg-surface-raised rounded-xl border border-border">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="font-display font-semibold text-sm text-text-primary">Custom Panel</h3>
                  <p className="text-xs text-text-muted mt-0.5">{selectedTests.length} test{selectedTests.length !== 1 ? "s" : ""} selected</p>
                </div>
                {selectedTests.length > 0 && (
                  <button onClick={clearAll} className="text-xs text-text-muted hover:text-danger transition-colors font-body">
                    Clear all
                  </button>
                )}
              </div>
              <div className="p-5">
                {selectedTests.length === 0 ? (
                  <div className="text-center py-8 text-text-muted text-sm font-body">
                    Select tests from the catalog to build a panel
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedTests.map((test) => (
                      <span key={test.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface text-sm font-body text-text-primary border border-border">
                        <span className="font-mono text-xs text-accent">{test.id}</span>
                        {test.name}
                        <button onClick={() => removeTest(test.id)} className="ml-1 text-text-muted hover:text-danger">
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <button
                  onClick={handleCalculate}
                  disabled={selectedTests.length === 0}
                  className="w-full py-3 rounded-lg bg-accent text-white font-body font-semibold text-sm hover:bg-accent-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Calculate Panel Price
                </button>
              </div>
            </div>

            {/* Results */}
            {result && (
              <div className="bg-surface-raised rounded-xl border border-border animate-scale-in">
                <div className="px-5 py-4 border-b border-border">
                  <h3 className="font-display font-semibold text-sm text-text-primary">Pricing Breakdown</h3>
                </div>

                {/* Per-test breakdown */}
                <div className="divide-y divide-border">
                  {result.tests.map((detail) => (
                    <div key={detail.test.id} className="px-5 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-body font-semibold px-2 py-0.5 rounded ${
                          detail.role === "anchor" ? "badge-anchor" : "badge-addon"
                        }`}>
                          {detail.role === "anchor" ? "ANCHOR" : "ADD-ON"}
                        </span>
                        <div>
                          <span className="text-sm font-body text-text-primary">{detail.test.name}</span>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs font-mono text-text-muted">List: ${detail.listPrice.toFixed(2)}</span>
                            <span className="text-xs font-mono text-text-muted">Reagent: ${detail.reagentCost.toFixed(2)}</span>
                            {detail.discountedPrice !== null && (
                              <span className="text-xs font-mono text-text-muted">
                                Disc: ${detail.discountedPrice.toFixed(2)} | Floor: ${detail.floorPrice?.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="font-mono text-sm font-semibold text-text-primary">${detail.finalPrice.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="px-5 py-4 bg-surface border-t border-border space-y-2">
                  <div className="flex justify-between text-sm font-body">
                    <span className="text-text-secondary">Subtotal</span>
                    <span className="font-mono text-text-primary">${result.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-body">
                    <span className="text-text-secondary">Donation</span>
                    <span className="font-mono text-text-muted">${result.donation.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-body">
                    <span className="text-text-secondary">Revenue Share</span>
                    <span className="font-mono text-text-muted">${result.revenueShare.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-body font-semibold pt-2 border-t border-border">
                    <span className="text-text-primary">Total Panel Price</span>
                    <span className="font-mono text-accent text-lg">${result.totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
