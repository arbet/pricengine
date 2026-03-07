"use client";

import { useState, useMemo } from "react";
import Header from "@/components/header";
import Modal from "@/components/modal";
import { createPanel, updatePanel, deletePanel } from "@/lib/db/actions/panel-actions";

interface PanelTest {
  id: string;
  testId: string;
  test: {
    id: string;
    testId: string;
    name: string;
    category: string | null;
  };
}

interface Panel {
  id: string;
  name: string;
  panelTests: PanelTest[];
}

interface LabTest {
  id: string;
  testId: string;
  name: string;
  category: string | null;
}

export default function PanelManagementClient({
  initialPanels,
  initialTests,
}: {
  initialPanels: Panel[];
  initialTests: LabTest[];
}) {
  const [panels, setPanels] = useState<Panel[]>(initialPanels);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editPanel, setEditPanel] = useState<Panel | null>(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formTestIds, setFormTestIds] = useState<string[]>([]);

  const filtered = useMemo(() => {
    if (!search) return panels;
    const q = search.toLowerCase();
    return panels.filter((p) => p.name.toLowerCase().includes(q));
  }, [panels, search]);

  const openAdd = () => {
    setFormName("");
    setFormTestIds([]);
    setShowAddModal(true);
  };

  const openEdit = (p: Panel) => {
    setFormName(p.name);
    setFormTestIds(p.panelTests.map((pt) => pt.testId));
    setEditPanel(p);
  };

  const handleAdd = async () => {
    if (!formName.trim() || formTestIds.length === 0) return;
    setLoading(true);
    try {
      const result = await createPanel({ name: formName, testIds: formTestIds });
      if (result.success) {
        setPanels([result.panel as Panel, ...panels]);
        setShowAddModal(false);
      }
    } catch (e) {
      console.error("Failed to create panel:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSave = async () => {
    if (!editPanel || !formName.trim() || formTestIds.length === 0) return;
    setLoading(true);
    try {
      const result = await updatePanel({
        id: editPanel.id,
        name: formName,
        testIds: formTestIds,
      });
      if (result.success) {
        setPanels(panels.map((p) => (p.id === editPanel.id ? (result.panel as Panel) : p)));
        setEditPanel(null);
      }
    } catch (e) {
      console.error("Failed to update panel:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      const result = await deletePanel(id);
      if (result.success) {
        setPanels(panels.filter((p) => p.id !== id));
      }
    } catch (e) {
      console.error("Failed to delete panel:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header title="Panel Management" />
      <div className="p-8">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search panels..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2.5 rounded-lg border border-border bg-white text-sm font-body w-72 focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <span className="text-sm text-text-muted font-body">{filtered.length} panels</span>
          </div>
          <button
            onClick={openAdd}
            disabled={loading}
            className="px-4 py-2.5 rounded-lg bg-accent text-white text-sm font-body font-semibold hover:bg-accent-light transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Add Panel
          </button>
        </div>

        {/* Table */}
        <div className="bg-surface-raised rounded-xl border border-border overflow-hidden animate-fade-in stagger-1 opacity-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="text-left px-6 py-3 text-xs font-body font-medium text-text-muted uppercase tracking-wider">Panel Name</th>
                <th className="text-left px-6 py-3 text-xs font-body font-medium text-text-muted uppercase tracking-wider">Tests</th>
                <th className="text-center px-6 py-3 text-xs font-body font-medium text-text-muted uppercase tracking-wider">Count</th>
                <th className="text-right px-6 py-3 text-xs font-body font-medium text-text-muted uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((panel) => (
                <tr key={panel.id} className="border-b border-border last:border-0 table-row-hover">
                  <td className="px-6 py-3.5 text-sm font-body font-medium text-text-primary">{panel.name}</td>
                  <td className="px-6 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {panel.panelTests.map((pt) => (
                        <span key={pt.id} className="text-xs font-mono px-1.5 py-0.5 rounded bg-surface border border-border text-text-muted">
                          {pt.test.testId}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    <span className="text-sm font-mono font-semibold text-text-secondary">{panel.panelTests.length}</span>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <button onClick={() => openEdit(panel)} disabled={loading} className="text-text-muted hover:text-accent transition-colors p-1 disabled:opacity-50">
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(panel.id)} disabled={loading} className="text-text-muted hover:text-danger transition-colors p-1 ml-1 disabled:opacity-50">
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-text-muted font-body">
                    {search ? "No panels match your search." : "No panels yet. Click \"Add Panel\" to create your first panel."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Panel Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Panel" width="max-w-2xl">
        <PanelForm
          name={formName} onName={setFormName}
          selectedTestIds={formTestIds} onSelectedTestIds={setFormTestIds}
          availableTests={initialTests}
          onSubmit={handleAdd}
          submitLabel={loading ? "Adding..." : "Add Panel"}
          disabled={loading}
        />
      </Modal>

      {/* Edit Panel Modal */}
      <Modal open={!!editPanel} onClose={() => setEditPanel(null)} title="Edit Panel" width="max-w-2xl">
        <PanelForm
          name={formName} onName={setFormName}
          selectedTestIds={formTestIds} onSelectedTestIds={setFormTestIds}
          availableTests={initialTests}
          onSubmit={handleEditSave}
          submitLabel={loading ? "Saving..." : "Save Changes"}
          disabled={loading}
        />
      </Modal>
    </div>
  );
}

function PanelForm({
  name, onName,
  selectedTestIds, onSelectedTestIds,
  availableTests,
  onSubmit,
  submitLabel,
  disabled,
}: {
  name: string; onName: (v: string) => void;
  selectedTestIds: string[]; onSelectedTestIds: (v: string[]) => void;
  availableTests: LabTest[];
  onSubmit: () => void;
  submitLabel: string;
  disabled?: boolean;
}) {
  const [attempted, setAttempted] = useState(false);
  const [testSearch, setTestSearch] = useState("");

  const nameInvalid = attempted && !name.trim();
  const testsInvalid = attempted && selectedTestIds.length === 0;

  const filteredTests = useMemo(() => {
    if (!testSearch) return availableTests;
    const q = testSearch.toLowerCase();
    return availableTests.filter(
      (t) => t.testId.toLowerCase().includes(q) || t.name.toLowerCase().includes(q) || (t.category || "").toLowerCase().includes(q)
    );
  }, [availableTests, testSearch]);

  const toggleTest = (id: string) => {
    onSelectedTestIds(
      selectedTestIds.includes(id)
        ? selectedTestIds.filter((t) => t !== id)
        : [...selectedTestIds, id]
    );
  };

  const handleSubmit = () => {
    setAttempted(true);
    if (!name.trim() || selectedTestIds.length === 0) return;
    onSubmit();
    setAttempted(false);
    setTestSearch("");
  };

  const inputClass = (invalid?: boolean) =>
    `mt-1 w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none transition-colors ${invalid ? "border-danger focus:border-danger" : "border-border focus:border-accent"}`;

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider">
          Panel Name<span className="text-danger ml-0.5">*</span>
        </label>
        <input value={name} onChange={(e) => onName(e.target.value)} className={inputClass(nameInvalid) + " font-body"} placeholder="e.g. Cardiac Workup" />
        {nameInvalid && <p className="mt-1 text-xs text-danger font-body">Panel name is required</p>}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider">
            Tests<span className="text-danger ml-0.5">*</span>
            <span className="ml-2 text-text-muted normal-case font-normal">
              {selectedTestIds.length} selected
            </span>
          </label>
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Filter tests..."
              value={testSearch}
              onChange={(e) => setTestSearch(e.target.value)}
              className="pl-7 pr-3 py-1.5 rounded-lg border border-border text-xs font-body w-44 focus:outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>
        <div className={`border rounded-xl overflow-hidden ${testsInvalid ? "border-danger" : "border-border"}`}>
          <div className="max-h-56 overflow-y-auto divide-y divide-border">
            {filteredTests.map((test) => {
              const checked = selectedTestIds.includes(test.id);
              return (
                <label
                  key={test.id}
                  className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${checked ? "bg-accent-muted" : "hover:bg-surface"}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleTest(test.id)}
                    className="accent-accent w-4 h-4 rounded"
                  />
                  <span className="font-mono text-xs text-accent w-14 shrink-0">{test.testId}</span>
                  <span className="text-sm font-body text-text-primary flex-1">{test.name}</span>
                  {test.category && (
                    <span className="text-xs font-body px-2 py-0.5 rounded bg-surface border border-border text-text-muted">{test.category}</span>
                  )}
                </label>
              );
            })}
            {filteredTests.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-text-muted font-body">No tests match your filter.</div>
            )}
          </div>
        </div>
        {testsInvalid && <p className="mt-1 text-xs text-danger font-body">Select at least one test</p>}
      </div>

      <button
        onClick={handleSubmit}
        disabled={disabled}
        className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-body font-semibold hover:bg-accent-light transition-colors mt-2 disabled:opacity-50"
      >
        {submitLabel}
      </button>
    </div>
  );
}
