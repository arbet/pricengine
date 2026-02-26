"use client";

import { useState, useMemo } from "react";
import Header from "@/components/header";
import Modal from "@/components/modal";
import { useAuth } from "@/context/auth-context";
import { labTests, LabTest } from "@/data/mock-data";

export default function TestManagementPage() {
  const { orgId } = useAuth();
  const [tests, setTests] = useState<LabTest[]>(() =>
    labTests.filter((t) => t.orgId === orgId)
  );
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTest, setEditTest] = useState<LabTest | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  // Form state
  const [formId, setFormId] = useState("");
  const [formName, setFormName] = useState("");
  const [formReagent, setFormReagent] = useState("");
  const [formList, setFormList] = useState("");
  const [formCategory, setFormCategory] = useState("");

  const filtered = useMemo(() => {
    if (!search) return tests;
    const q = search.toLowerCase();
    return tests.filter(
      (t) => t.id.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)
    );
  }, [tests, search]);

  const openAdd = () => {
    setFormId(`T-${String(tests.length + 1).padStart(3, "0")}`);
    setFormName(""); setFormReagent(""); setFormList(""); setFormCategory("");
    setShowAddModal(true);
  };

  const openEdit = (t: LabTest) => {
    setFormId(t.id);
    setFormName(t.name);
    setFormReagent(t.reagentCost.toString());
    setFormList(t.listPrice.toString());
    setFormCategory(t.category);
    setEditTest(t);
  };

  const handleAdd = () => {
    const newTest: LabTest = {
      id: formId || `T-${String(tests.length + 1).padStart(3, "0")}`,
      name: formName,
      reagentCost: parseFloat(formReagent) || 0,
      listPrice: parseFloat(formList) || 0,
      category: formCategory,
      orgId: orgId || "org-1",
    };
    setTests([...tests, newTest]);
    setShowAddModal(false);
  };

  const handleEditSave = () => {
    if (!editTest) return;
    setTests(tests.map((t) =>
      t.id === editTest.id
        ? { ...t, id: formId, name: formName, reagentCost: parseFloat(formReagent) || 0, listPrice: parseFloat(formList) || 0, category: formCategory }
        : t
    ));
    setEditTest(null);
  };

  const handleDelete = (id: string) => {
    setTests(tests.filter((t) => t.id !== id));
  };

  return (
    <div>
      <Header title="Test Management" />
      <div className="p-8">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6 animate-fade-in">
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search by ID or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2.5 rounded-lg border border-border bg-white text-sm font-body w-72 focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <span className="text-sm text-text-muted font-body">{filtered.length} tests</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowUpload(true)}
              className="px-4 py-2.5 rounded-lg border border-border text-sm font-body font-medium text-text-secondary hover:bg-surface transition-colors flex items-center gap-2"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Bulk Upload
            </button>
            <button
              onClick={openAdd}
              className="px-4 py-2.5 rounded-lg bg-accent text-white text-sm font-body font-semibold hover:bg-accent-light transition-colors flex items-center gap-2"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              Add Test
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-surface-raised rounded-xl border border-border overflow-hidden animate-fade-in stagger-1 opacity-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="text-left px-6 py-3 text-xs font-body font-medium text-text-muted uppercase tracking-wider">Test ID</th>
                <th className="text-left px-6 py-3 text-xs font-body font-medium text-text-muted uppercase tracking-wider">Test Name</th>
                <th className="text-left px-6 py-3 text-xs font-body font-medium text-text-muted uppercase tracking-wider">Category</th>
                <th className="text-right px-6 py-3 text-xs font-body font-medium text-text-muted uppercase tracking-wider">Reagent Cost</th>
                <th className="text-right px-6 py-3 text-xs font-body font-medium text-text-muted uppercase tracking-wider">List Price</th>
                <th className="text-right px-6 py-3 text-xs font-body font-medium text-text-muted uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((test) => (
                <tr key={test.id} className="border-b border-border last:border-0 table-row-hover">
                  <td className="px-6 py-3.5 font-mono text-sm text-accent font-medium">{test.id}</td>
                  <td className="px-6 py-3.5 text-sm font-body text-text-primary">{test.name}</td>
                  <td className="px-6 py-3.5">
                    <span className="text-xs font-body px-2 py-1 rounded-md bg-surface text-text-secondary">{test.category}</span>
                  </td>
                  <td className="px-6 py-3.5 text-right font-mono text-sm text-text-secondary">${test.reagentCost.toFixed(2)}</td>
                  <td className="px-6 py-3.5 text-right font-mono text-sm font-medium text-text-primary">${test.listPrice.toFixed(2)}</td>
                  <td className="px-6 py-3.5 text-right">
                    <button onClick={() => openEdit(test)} className="text-text-muted hover:text-accent transition-colors p-1">
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(test.id)} className="text-text-muted hover:text-danger transition-colors p-1 ml-1">
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-text-muted font-body">
                    No tests match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Test Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Test">
        <TestForm
          testId={formId} onTestId={setFormId}
          name={formName} onName={setFormName}
          reagent={formReagent} onReagent={setFormReagent}
          list={formList} onList={setFormList}
          category={formCategory} onCategory={setFormCategory}
          onSubmit={handleAdd}
          submitLabel="Add Test"
          requiredFields
        />
      </Modal>

      {/* Edit Test Modal */}
      <Modal open={!!editTest} onClose={() => setEditTest(null)} title="Edit Test">
        <TestForm
          testId={formId} onTestId={setFormId}
          name={formName} onName={setFormName}
          reagent={formReagent} onReagent={setFormReagent}
          list={formList} onList={setFormList}
          category={formCategory} onCategory={setFormCategory}
          onSubmit={handleEditSave}
          submitLabel="Save Changes"
          requiredFields
        />
      </Modal>

      {/* Upload Modal */}
      <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Bulk Upload Test Catalog">
        <div className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-xl p-10 text-center hover:border-accent transition-colors cursor-pointer">
            <svg className="mx-auto mb-3 text-text-muted" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-sm font-body text-text-secondary font-medium">Drop your Excel file here or click to browse</p>
            <p className="text-xs text-text-muted mt-1">.xlsx format, max 5MB</p>
          </div>
          <div className="bg-surface rounded-lg p-4">
            <p className="text-xs font-body font-medium text-text-secondary mb-2">Required columns:</p>
            <div className="flex flex-wrap gap-2">
              {["Test ID", "Test Name", "Reagent Cost", "List Price", "Category"].map((col) => (
                <span key={col} className="text-xs font-mono px-2 py-1 rounded bg-white border border-border text-text-muted">{col}</span>
              ))}
            </div>
          </div>
          <button className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-body font-semibold hover:bg-accent-light transition-colors opacity-40 cursor-not-allowed">
            Upload &amp; Validate
          </button>
        </div>
      </Modal>
    </div>
  );
}

function TestForm({ testId, onTestId, name, onName, reagent, onReagent, list, onList, category, onCategory, onSubmit, submitLabel, requiredFields }: {
  testId?: string; onTestId?: (v: string) => void;
  name: string; onName: (v: string) => void;
  reagent: string; onReagent: (v: string) => void;
  list: string; onList: (v: string) => void;
  category: string; onCategory: (v: string) => void;
  onSubmit: () => void;
  submitLabel: string;
  requiredFields?: boolean;
}) {
  const [attempted, setAttempted] = useState(false);

  const idInvalid = requiredFields && attempted && !testId?.trim();
  const nameInvalid = requiredFields && attempted && !name.trim();
  const listInvalid = requiredFields && attempted && !list.trim();

  const handleSubmit = () => {
    if (requiredFields) {
      setAttempted(true);
      if (!testId?.trim() || !name.trim() || !list.trim()) return;
    }
    onSubmit();
    setAttempted(false);
  };

  const inputClass = (invalid?: boolean) =>
    `mt-1 w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none transition-colors ${invalid ? "border-danger focus:border-danger" : "border-border focus:border-accent"}`;

  return (
    <div className="space-y-4">
      {testId !== undefined && onTestId && (
        <div>
          <label className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider">
            Test ID{requiredFields && <span className="text-danger ml-0.5">*</span>}
          </label>
          <input value={testId} onChange={(e) => onTestId(e.target.value)} className={inputClass(idInvalid) + " font-mono"} />
          {idInvalid && <p className="mt-1 text-xs text-danger font-body">Test ID is required</p>}
        </div>
      )}
      <div>
        <label className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider">
          Test Name{requiredFields && <span className="text-danger ml-0.5">*</span>}
        </label>
        <input value={name} onChange={(e) => onName(e.target.value)} className={inputClass(nameInvalid) + " font-body"} />
        {nameInvalid && <p className="mt-1 text-xs text-danger font-body">Test Name is required</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider">Reagent Cost ($)</label>
          <input type="number" step="0.01" value={reagent} onChange={(e) => onReagent(e.target.value)} className={inputClass() + " font-mono"} />
        </div>
        <div>
          <label className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider">
            List Price ($){requiredFields && <span className="text-danger ml-0.5">*</span>}
          </label>
          <input type="number" step="0.01" value={list} onChange={(e) => onList(e.target.value)} className={inputClass(listInvalid) + " font-mono"} />
          {listInvalid && <p className="mt-1 text-xs text-danger font-body">List Price is required</p>}
        </div>
      </div>
      <div>
        <label className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider">Category</label>
        <input value={category} onChange={(e) => onCategory(e.target.value)} className={inputClass() + " font-body"} />
      </div>
      <button onClick={handleSubmit} className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-body font-semibold hover:bg-accent-light transition-colors mt-2">
        {submitLabel}
      </button>
    </div>
  );
}
