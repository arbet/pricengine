"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/header";
import Modal from "@/components/modal";
import { createTest, updateTest, deleteTest, uploadTestCatalog } from "@/lib/db/actions/test-actions";

interface LabTestRow {
  id: string;
  testId: string;
  name: string;
  reagentCost: number | string;
  listPrice: number | string;
  category: string | null;
}

export default function TestManagementClient({
  initialTests,
  total,
  page,
  pageSize,
}: {
  initialTests: LabTestRow[];
  total: number;
  page: number;
  pageSize: number;
}) {
  const router = useRouter();
  const [tests, setTests] = useState<LabTestRow[]>(initialTests);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTest, setEditTest] = useState<LabTestRow | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ message: string; isError: boolean } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [formTestId, setFormTestId] = useState("");
  const [formName, setFormName] = useState("");
  const [formReagent, setFormReagent] = useState("");
  const [formList, setFormList] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formError, setFormError] = useState("");

  const filtered = useMemo(() => {
    if (!search) return tests;
    const q = search.toLowerCase();
    return tests.filter(
      (t) => t.testId.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)
    );
  }, [tests, search]);

  const openAdd = () => {
    setFormTestId(""); setFormName(""); setFormReagent(""); setFormList(""); setFormCategory(""); setFormError("");
    setShowAddModal(true);
  };

  const openEdit = (t: LabTestRow) => {
    setFormTestId(t.testId);
    setFormName(t.name);
    setFormReagent(String(Number(t.reagentCost)));
    setFormList(String(Number(t.listPrice)));
    setFormCategory(t.category || "");
    setFormError("");
    setEditTest(t);
  };

  const handleAdd = async () => {
    if (!formTestId.trim() || !formName.trim() || !formList.trim()) return;
    setFormError("");
    const result = await createTest({
      testId: formTestId,
      name: formName,
      reagentCost: parseFloat(formReagent) || 0,
      listPrice: parseFloat(formList) || 0,
      category: formCategory || undefined,
    });
    if (result.success && "test" in result) {
      setTests([...tests, result.test as unknown as LabTestRow]);
      setShowAddModal(false);
    } else if (!result.success && "error" in result) {
      setFormError(result.error);
    }
  };

  const handleEditSave = async () => {
    if (!editTest) return;
    setFormError("");
    const result = await updateTest({
      id: editTest.id,
      testId: formTestId,
      name: formName,
      reagentCost: parseFloat(formReagent) || 0,
      listPrice: parseFloat(formList) || 0,
      category: formCategory || undefined,
    });
    if (result.success && "test" in result) {
      setTests(tests.map((t) => (t.id === editTest.id ? result.test as unknown as LabTestRow : t)));
      setEditTest(null);
    } else if (!result.success && "error" in result) {
      setFormError(result.error);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deleteTest(id);
    if (result.success) {
      setTests(tests.filter((t) => t.id !== id));
    }
  };

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadStatus(null);

    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadTestCatalog(formData);

    setUploading(false);
    if (result.success) {
      setUploadStatus({ message: `Successfully imported ${result.importedCount} tests.`, isError: false });
      // Reload page to get fresh data
      window.location.reload();
    } else {
      const errorMsg = result.errors?.map((e) => `Row ${e.row}: ${e.message}`).join("\n") || "Upload failed";
      setUploadStatus({ message: errorMsg, isError: true });
    }
  };

  const num = (v: number | string) => Number(v);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const goToPage = (p: number) => router.push(`?page=${p}`);

  return (
    <div>
      <Header title="Test Management" />
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
                placeholder="Search by ID or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2.5 rounded-lg border border-border bg-white text-sm font-body w-72 focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <span className="text-sm text-text-muted font-body">
              {search ? `${filtered.length} on this page` : `${total} tests`}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setShowUpload(true); setUploadStatus(null); setFileName(""); }}
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
                  <td className="px-6 py-3.5 font-mono text-sm text-accent font-medium">{test.testId}</td>
                  <td className="px-6 py-3.5 text-sm font-body text-text-primary">{test.name}</td>
                  <td className="px-6 py-3.5">
                    <span className="text-xs font-body px-2 py-1 rounded-md bg-surface text-text-secondary">{test.category || "—"}</span>
                  </td>
                  <td className="px-6 py-3.5 text-right font-mono text-sm text-text-secondary">${num(test.reagentCost).toFixed(2)}</td>
                  <td className="px-6 py-3.5 text-right font-mono text-sm font-medium text-text-primary">${num(test.listPrice).toFixed(2)}</td>
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 animate-fade-in stagger-2 opacity-0">
            <span className="text-sm text-text-muted font-body">
              Page {page} of {totalPages} &mdash; {total} total tests
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-border text-sm font-body text-text-secondary hover:bg-surface transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === "..." ? (
                    <span key={`ellipsis-${idx}`} className="px-2 text-text-muted text-sm">…</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => goToPage(item as number)}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-body transition-colors ${
                        item === page
                          ? "bg-accent text-white border-accent"
                          : "border-border text-text-secondary hover:bg-surface"
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-border text-sm font-body text-text-secondary hover:bg-surface transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Test Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Test">
        <TestForm
          testId={formTestId} onTestId={setFormTestId}
          name={formName} onName={setFormName}
          reagent={formReagent} onReagent={setFormReagent}
          list={formList} onList={setFormList}
          category={formCategory} onCategory={setFormCategory}
          onSubmit={handleAdd}
          submitLabel="Add Test"
          error={formError}
        />
      </Modal>

      {/* Edit Test Modal */}
      <Modal open={!!editTest} onClose={() => setEditTest(null)} title="Edit Test">
        <TestForm
          testId={formTestId} onTestId={setFormTestId}
          name={formName} onName={setFormName}
          reagent={formReagent} onReagent={setFormReagent}
          list={formList} onList={setFormList}
          category={formCategory} onCategory={setFormCategory}
          onSubmit={handleEditSave}
          submitLabel="Save Changes"
          error={formError}
        />
      </Modal>

      {/* Upload Modal */}
      <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Bulk Upload Test Catalog">
        <div className="space-y-4">
          <div
            className="border-2 border-dashed border-border rounded-xl p-10 text-center hover:border-accent transition-colors cursor-pointer"
            onClick={() => fileRef.current?.click()}
          >
            <svg className="mx-auto mb-3 text-text-muted" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-sm font-body text-text-secondary font-medium">
              {fileName ? fileName : "Click to select your Excel file"}
            </p>
            <p className="text-xs text-text-muted mt-1">.xlsx format, max 5MB</p>
            <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={(e) => { setFileName(e.target.files?.[0]?.name || ""); setUploadStatus(null); }} />
          </div>
          <div className="bg-surface rounded-lg p-4">
            <p className="text-xs font-body font-medium text-text-secondary mb-2">Required columns (in order):</p>
            <div className="flex flex-wrap gap-2">
              {["Test ID", "Test Name", "Reagent Cost", "List Price", "Category"].map((col) => (
                <span key={col} className="text-xs font-mono px-2 py-1 rounded bg-white border border-border text-text-muted">{col}</span>
              ))}
            </div>
            <a
              href="/test-catalog-sample.xlsx"
              download
              className="inline-flex items-center gap-1.5 mt-3 text-xs font-body font-medium text-accent hover:text-accent-light transition-colors"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Download sample template
            </a>
          </div>
          {uploadStatus && (
            <div className={`text-sm font-body p-3 rounded-lg whitespace-pre-wrap ${uploadStatus.isError ? "bg-danger-light text-danger" : "bg-success-light text-success"}`}>
              {uploadStatus.message}
            </div>
          )}
          <button
            onClick={handleUpload}
            disabled={uploading || !fileName}
            className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-body font-semibold hover:bg-accent-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {uploading ? "Uploading..." : "Upload & Validate"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function TestForm({ testId, onTestId, name, onName, reagent, onReagent, list, onList, category, onCategory, onSubmit, submitLabel, error }: {
  testId: string; onTestId: (v: string) => void;
  name: string; onName: (v: string) => void;
  reagent: string; onReagent: (v: string) => void;
  list: string; onList: (v: string) => void;
  category: string; onCategory: (v: string) => void;
  onSubmit: () => void;
  submitLabel: string;
  error?: string;
}) {
  const [attempted, setAttempted] = useState(false);

  const idInvalid = attempted && !testId.trim();
  const nameInvalid = attempted && !name.trim();
  const listInvalid = attempted && !list.trim();

  const handleSubmit = () => {
    setAttempted(true);
    if (!testId.trim() || !name.trim() || !list.trim()) return;
    onSubmit();
    setAttempted(false);
  };

  const inputClass = (invalid?: boolean) =>
    `mt-1 w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none transition-colors ${invalid ? "border-danger focus:border-danger" : "border-border focus:border-accent"}`;

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider">
          Test ID<span className="text-danger ml-0.5">*</span>
        </label>
        <input value={testId} onChange={(e) => onTestId(e.target.value)} className={inputClass(idInvalid) + " font-mono"} />
        {idInvalid && <p className="mt-1 text-xs text-danger font-body">Test ID is required</p>}
      </div>
      <div>
        <label className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider">
          Test Name<span className="text-danger ml-0.5">*</span>
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
            List Price ($)<span className="text-danger ml-0.5">*</span>
          </label>
          <input type="number" step="0.01" value={list} onChange={(e) => onList(e.target.value)} className={inputClass(listInvalid) + " font-mono"} />
          {listInvalid && <p className="mt-1 text-xs text-danger font-body">List Price is required</p>}
        </div>
      </div>
      <div>
        <label className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider">Category</label>
        <input value={category} onChange={(e) => onCategory(e.target.value)} className={inputClass() + " font-body"} />
      </div>
      {error && <p className="text-xs text-red-500 font-body">{error}</p>}
      <button onClick={handleSubmit} className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-body font-semibold hover:bg-accent-light transition-colors mt-2">
        {submitLabel}
      </button>
    </div>
  );
}
