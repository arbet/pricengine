"use client";

import { useState } from "react";
import Header from "@/components/header";
import Modal from "@/components/modal";
import {
  createSuperAdmin,
  updateSuperAdmin,
  regenerateSuperAdminApiKey,
  archiveSuperAdmin,
  restoreSuperAdmin,
} from "@/lib/db/actions/admin-actions";

interface AdminRow {
  id: string;
  name: string;
  email: string;
  apiKey: string | null;
  archivedAt: string | null;
  createdAt: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fieldClass(invalid?: boolean) {
  return `mt-1 w-full px-4 py-2.5 rounded-lg border text-sm font-body focus:outline-none transition-colors ${invalid ? "border-red-500 focus:border-red-500" : "border-border focus:border-accent"}`;
}

function maskKey(key: string) {
  const prefix = key.split("-")[0];
  return `${prefix}-${"•".repeat(32)}`;
}

export default function SuperAdminClient({
  initialAdmins,
  currentUserId,
}: {
  initialAdmins: AdminRow[];
  currentUserId: string;
}) {
  const [admins, setAdmins] = useState(initialAdmins);
  const [showArchived, setShowArchived] = useState(false);
  const [actionError, setActionError] = useState("");

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addShowPw, setAddShowPw] = useState(false);
  const [addAttempted, setAddAttempted] = useState(false);

  // Edit form
  const [editing, setEditing] = useState<AdminRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editConfirm, setEditConfirm] = useState("");
  const [editShowPw, setEditShowPw] = useState(false);
  const [editAttempted, setEditAttempted] = useState(false);
  const [editError, setEditError] = useState("");

  // Confirmations
  const [archiveConfirmId, setArchiveConfirmId] = useState<string | null>(null);
  const [restoreConfirmId, setRestoreConfirmId] = useState<string | null>(null);
  const [regenConfirmId, setRegenConfirmId] = useState<string | null>(null);

  // API key reveal/copy
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeAdmins = admins.filter((a) => !a.archivedAt);
  const archivedAdmins = admins.filter((a) => !!a.archivedAt);
  const displayed = showArchived ? admins : activeAdmins;

  // --- Add validation ---
  const addNameErr = addAttempted && !addName.trim() ? "Name is required" : "";
  const addEmailErr = addAttempted && !addEmail.trim() ? "Email is required" : addAttempted && !EMAIL_RE.test(addEmail) ? "Invalid email format" : "";
  const addPwErr = addAttempted && !addPassword ? "Password is required" : addAttempted && addPassword.length < 6 ? "Password must be at least 6 characters" : "";
  const addValid = addName.trim() && EMAIL_RE.test(addEmail) && addPassword.length >= 6;

  const resetAdd = () => {
    setShowAdd(false);
    setAddName(""); setAddEmail(""); setAddPassword("");
    setAddShowPw(false); setAddAttempted(false); setActionError("");
  };

  const handleAdd = async () => {
    setAddAttempted(true);
    if (!addValid) return;
    setActionError("");
    const result = await createSuperAdmin({ name: addName, email: addEmail, password: addPassword });
    if (result.success && "admin" in result) {
      setAdmins([...admins, { ...result.admin, createdAt: result.admin.createdAt as unknown as string, archivedAt: null }]);
      setRevealedKeys((prev) => new Set(prev).add(result.admin.id));
      resetAdd();
    } else if (!result.success && "error" in result) {
      setActionError(result.error);
    }
  };

  // --- Edit validation ---
  const editNameErr = editAttempted && !editName.trim() ? "Name is required" : "";
  const editEmailErr = editAttempted && !editEmail.trim() ? "Email is required" : editAttempted && !EMAIL_RE.test(editEmail) ? "Invalid email format" : "";
  const editPwLenErr = editAttempted && editPassword && editPassword.length < 6 ? "Password must be at least 6 characters" : "";
  const editPwMatchErr = editAttempted && editPassword && editPassword !== editConfirm ? "Passwords do not match" : "";
  const editValid = editName.trim() && EMAIL_RE.test(editEmail) && (!editPassword || (editPassword.length >= 6 && editPassword === editConfirm));

  const openEdit = (a: AdminRow) => {
    setEditing(a);
    setEditName(a.name); setEditEmail(a.email);
    setEditPassword(""); setEditConfirm("");
    setEditShowPw(false); setEditAttempted(false); setEditError("");
  };

  const handleSaveEdit = async () => {
    setEditAttempted(true);
    if (!editing || !editValid) return;
    setEditError("");
    const result = await updateSuperAdmin({
      id: editing.id,
      name: editName,
      email: editEmail,
      ...(editPassword ? { password: editPassword } : {}),
    });
    if (result.success && "admin" in result) {
      setAdmins(admins.map((a) => (a.id === editing.id ? { ...a, name: result.admin.name, email: result.admin.email } : a)));
      setEditing(null);
    } else if (!result.success && "error" in result) {
      setEditError(result.error);
    }
  };

  const handleRegenerate = async (id: string) => {
    const result = await regenerateSuperAdminApiKey(id);
    if (result.success && "apiKey" in result) {
      setAdmins(admins.map((a) => (a.id === id ? { ...a, apiKey: result.apiKey } : a)));
      setRevealedKeys((prev) => new Set(prev).add(id));
    } else if (!result.success && "error" in result) {
      setActionError(result.error);
    }
    setRegenConfirmId(null);
  };

  const handleArchive = async (id: string) => {
    const result = await archiveSuperAdmin(id);
    if (result.success) {
      setAdmins(admins.map((a) => (a.id === id ? { ...a, archivedAt: new Date().toISOString() } : a)));
    } else if ("error" in result) {
      setActionError(result.error);
    }
    setArchiveConfirmId(null);
  };

  const handleRestore = async (id: string) => {
    const result = await restoreSuperAdmin(id);
    if (result.success) {
      setAdmins(admins.map((a) => (a.id === id ? { ...a, archivedAt: null } : a)));
    } else if ("error" in result) {
      setActionError(result.error);
    }
    setRestoreConfirmId(null);
  };

  const toggleKeyReveal = (id: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const copyKey = async (a: AdminRow) => {
    if (!a.apiKey) return;
    await navigator.clipboard.writeText(a.apiKey);
    setCopiedId(a.id);
    setTimeout(() => setCopiedId((cur) => (cur === a.id ? null : cur)), 2000);
  };

  return (
    <div>
      <Header title="Super Admins" />
      <div className="p-8">
        {actionError && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm font-body text-red-600">
            {actionError}
          </div>
        )}

        <div className="mb-6 px-4 py-3 rounded-lg bg-accent-muted/40 border border-accent/20 text-sm font-body text-text-secondary">
          Super-admin API keys authorize the cross-organization pricing comparison endpoint
          (<code className="font-mono text-xs text-accent">POST /api/v1/pricing/compare</code>).
          Treat them as privileged credentials &mdash; they expose pricing for every organization.
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-base text-text-primary">
            All Super Admins <span className="ml-1 font-mono text-xs text-text-muted font-normal">({activeAdmins.length})</span>
          </h2>
          <div className="flex items-center gap-3">
            {archivedAdmins.length > 0 && (
              <button onClick={() => setShowArchived(!showArchived)}
                className={`px-3 py-2 rounded-lg text-xs font-body font-semibold transition-colors ${showArchived ? "bg-amber-500/10 text-amber-500 border border-amber-500/30" : "text-text-muted hover:text-text-secondary border border-border"}`}>
                {showArchived ? `Hide Archived (${archivedAdmins.length})` : `Show Archived (${archivedAdmins.length})`}
              </button>
            )}
            <button onClick={() => { setActionError(""); setAddAttempted(false); setShowAdd(true); }}
              className="px-4 py-2.5 rounded-lg bg-accent text-white text-sm font-body font-semibold hover:bg-accent-light transition-colors flex items-center gap-2">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
              Add Super Admin
            </button>
          </div>
        </div>

        {/* Admin list */}
        <div className="space-y-2">
          {displayed.map((a) => {
            const isArchived = !!a.archivedAt;
            const isSelf = a.id === currentUserId;
            return (
              <div key={a.id} className={`bg-surface-raised rounded-xl border p-5 ${isArchived ? "border-amber-500/30 opacity-75" : "border-border"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${isArchived ? "bg-amber-500/5 border-amber-500/20" : "bg-surface border-border"}`}>
                      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className={isArchived ? "text-amber-500" : "text-accent"}>
                        <path d="M12 2l8 4v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10V6l8-4z" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-display font-semibold ${isArchived ? "text-text-muted" : "text-text-primary"}`}>{a.name}</span>
                        {isSelf && <span className="text-[10px] font-body font-semibold px-1.5 py-0.5 rounded bg-accent-muted text-accent uppercase tracking-wider">You</span>}
                        {isArchived && <span className="text-[10px] font-body font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 uppercase tracking-wider">Archived</span>}
                      </div>
                      <div className="font-body text-xs text-text-secondary mt-0.5">{a.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!isArchived && (
                      <button onClick={() => openEdit(a)} title="Edit super admin" className="p-1.5 text-text-muted hover:text-accent hover:bg-accent-muted rounded-lg transition-colors">
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                    )}
                    {isArchived ? (
                      <button onClick={() => setRestoreConfirmId(a.id)} title="Restore super admin"
                        className="px-2.5 py-1 text-xs font-body font-semibold text-accent hover:bg-accent-muted rounded-lg transition-colors">
                        Restore
                      </button>
                    ) : !isSelf && (
                      <button onClick={() => setArchiveConfirmId(a.id)} title="Archive super admin"
                        className="p-1.5 text-amber-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors">
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* API Key */}
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-[11px] font-body font-medium text-text-muted uppercase tracking-wider mb-1.5">API Key</p>
                  {a.apiKey ? (
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-sm text-text-secondary select-all break-all">
                        {revealedKeys.has(a.id) ? a.apiKey : maskKey(a.apiKey)}
                      </code>
                      <div className="flex items-center gap-1 ml-auto shrink-0">
                        <button onClick={() => toggleKeyReveal(a.id)} title={revealedKeys.has(a.id) ? "Hide API key" : "Reveal API key"}
                          className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface rounded-lg transition-colors">
                          {revealedKeys.has(a.id) ? (
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                          ) : (
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          )}
                        </button>
                        <button onClick={() => copyKey(a)} title="Copy API key"
                          className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface rounded-lg transition-colors">
                          {copiedId === a.id ? (
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-green-500"><polyline points="20 6 9 17 4 12"/></svg>
                          ) : (
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                          )}
                        </button>
                        {!isArchived && (
                          <button onClick={() => setRegenConfirmId(a.id)} title="Regenerate API key"
                            className="p-1.5 text-text-muted hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors">
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm font-body text-text-muted">No API key generated</p>
                  )}
                </div>
              </div>
            );
          })}
          {displayed.length === 0 && (
            <div className="py-10 text-center text-sm text-text-muted font-body border border-dashed border-border rounded-xl">
              No super admins yet.
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      <Modal open={showAdd} onClose={resetAdd} title="Add Super Admin">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider">Full Name <span className="text-red-500">*</span></label>
            <input value={addName} onChange={(e) => setAddName(e.target.value)} className={fieldClass(!!addNameErr)} />
            {addNameErr && <p className="mt-1 text-xs text-red-500 font-body">{addNameErr}</p>}
          </div>
          <div>
            <label className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider">Email <span className="text-red-500">*</span></label>
            <input type="email" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} autoComplete="off" className={fieldClass(!!addEmailErr)} />
            {addEmailErr && <p className="mt-1 text-xs text-red-500 font-body">{addEmailErr}</p>}
          </div>
          <div>
            <label className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider">Password <span className="text-red-500">*</span></label>
            <div className="relative mt-1">
              <input type={addShowPw ? "text" : "password"} value={addPassword} onChange={(e) => setAddPassword(e.target.value)}
                placeholder="Min. 6 characters" autoComplete="new-password"
                className={`w-full px-4 py-2.5 pr-10 rounded-lg border text-sm font-body focus:outline-none transition-colors ${addPwErr ? "border-red-500 focus:border-red-500" : "border-border focus:border-accent"}`} />
              <button type="button" onClick={() => setAddShowPw(!addShowPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary">
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
            {addPwErr && <p className="mt-1 text-xs text-red-500 font-body">{addPwErr}</p>}
          </div>
          {actionError && showAdd && <p className="text-xs text-red-500 font-body">{actionError}</p>}
          <button onClick={handleAdd}
            className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-body font-semibold hover:bg-accent-light transition-colors mt-2">
            Create Super Admin
          </button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Super Admin" width="max-w-md">
        {editing && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider">Full Name <span className="text-red-500">*</span></label>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} className={fieldClass(!!editNameErr)} />
              {editNameErr && <p className="mt-1 text-xs text-red-500 font-body">{editNameErr}</p>}
            </div>
            <div>
              <label className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider">Email <span className="text-red-500">*</span></label>
              <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className={fieldClass(!!editEmailErr)} />
              {editEmailErr && <p className="mt-1 text-xs text-red-500 font-body">{editEmailErr}</p>}
            </div>
            <div className="border-t border-border pt-4">
              <p className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider mb-3">
                New Password <span className="normal-case text-text-muted font-normal ml-1">&mdash; leave blank to keep current</span>
              </p>
              <div className="space-y-3">
                <div className="relative">
                  <input type={editShowPw ? "text" : "password"} value={editPassword} onChange={(e) => { setEditPassword(e.target.value); setEditError(""); }}
                    placeholder="Min. 6 characters"
                    className={`w-full px-4 py-2.5 pr-10 rounded-lg border text-sm font-body focus:outline-none transition-colors ${editPwLenErr ? "border-red-500 focus:border-red-500" : "border-border focus:border-accent"}`} />
                  <button type="button" onClick={() => setEditShowPw(!editShowPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary">
                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </div>
                {editPwLenErr && <p className="text-xs text-red-500 font-body">{editPwLenErr}</p>}
                <input type={editShowPw ? "text" : "password"} value={editConfirm} onChange={(e) => { setEditConfirm(e.target.value); setEditError(""); }}
                  placeholder="Confirm new password"
                  className={`w-full px-4 py-2.5 rounded-lg border text-sm font-body focus:outline-none transition-colors ${editPwMatchErr ? "border-red-500 focus:border-red-500" : "border-border focus:border-accent"}`} />
                {editPwMatchErr && <p className="text-xs text-red-500 font-body">{editPwMatchErr}</p>}
                {editError && <p className="text-xs text-red-500 font-body">{editError}</p>}
              </div>
            </div>
            <button onClick={handleSaveEdit}
              className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-body font-semibold hover:bg-accent-light transition-colors">
              Save Changes
            </button>
          </div>
        )}
      </Modal>

      {/* Regenerate Confirmation */}
      <Modal open={!!regenConfirmId} onClose={() => setRegenConfirmId(null)} title="Regenerate API Key" width="max-w-md">
        {regenConfirmId && (() => {
          const a = admins.find((x) => x.id === regenConfirmId);
          return (
            <div className="space-y-4">
              <p className="text-sm font-body text-text-secondary">
                Regenerate the API key for <span className="font-semibold text-text-primary">{a?.name}</span>?
                The current key will be permanently invalidated. Any integration using the old key will stop working immediately.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setRegenConfirmId(null)}
                  className="flex-1 py-2.5 rounded-lg border border-border text-sm font-body font-semibold text-text-secondary hover:text-text-primary hover:border-text-secondary transition-colors">Cancel</button>
                <button onClick={() => handleRegenerate(regenConfirmId)}
                  className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-sm font-body font-semibold hover:bg-red-700 transition-colors">Regenerate</button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Archive Confirmation */}
      <Modal open={!!archiveConfirmId} onClose={() => setArchiveConfirmId(null)} title="Archive Super Admin" width="max-w-md">
        {archiveConfirmId && (() => {
          const a = admins.find((x) => x.id === archiveConfirmId);
          return (
            <div className="space-y-4">
              <p className="text-sm font-body text-text-secondary">
                Archive <span className="font-semibold text-text-primary">{a?.name}</span> ({a?.email})?
                They will no longer be able to log in, and their API key will stop working.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setArchiveConfirmId(null)}
                  className="flex-1 py-2.5 rounded-lg border border-border text-sm font-body font-semibold text-text-secondary hover:text-text-primary hover:border-text-secondary transition-colors">Cancel</button>
                <button onClick={() => handleArchive(archiveConfirmId)}
                  className="flex-1 py-2.5 rounded-lg bg-amber-500 text-white text-sm font-body font-semibold hover:bg-amber-600 transition-colors">Archive</button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Restore Confirmation */}
      <Modal open={!!restoreConfirmId} onClose={() => setRestoreConfirmId(null)} title="Restore Super Admin" width="max-w-md">
        {restoreConfirmId && (() => {
          const a = admins.find((x) => x.id === restoreConfirmId);
          return (
            <div className="space-y-4">
              <p className="text-sm font-body text-text-secondary">
                Restore <span className="font-semibold text-text-primary">{a?.name}</span> ({a?.email})?
                They will be able to log in again and their API key will work once more.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setRestoreConfirmId(null)}
                  className="flex-1 py-2.5 rounded-lg border border-border text-sm font-body font-semibold text-text-secondary hover:text-text-primary hover:border-text-secondary transition-colors">Cancel</button>
                <button onClick={() => handleRestore(restoreConfirmId)}
                  className="flex-1 py-2.5 rounded-lg bg-accent text-white text-sm font-body font-semibold hover:bg-accent-light transition-colors">Restore</button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
