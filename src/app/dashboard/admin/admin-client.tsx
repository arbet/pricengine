"use client";

import { useState } from "react";
import Header from "@/components/header";
import Modal from "@/components/modal";
import { getRoleName } from "@/context/auth-context";
import {
  createOrganization,
  updateOrganization,
  archiveOrganization,
  restoreOrganization,
  createUser,
  updateUser,
  archiveUser,
  restoreUser,
} from "@/lib/db/actions/admin-actions";

interface OrgRow {
  id: string;
  name: string;
  code: string;
  contactEmail: string | null;
  phone: string | null;
  address: string | null;
  createdAt: string;
  archivedAt: string | null;
  _count: { users: number; labTests: number };
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  orgId: string | null;
  archivedAt: string | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fieldClass(invalid?: boolean) {
  return `mt-1 w-full px-4 py-2.5 rounded-lg border text-sm font-body focus:outline-none transition-colors ${invalid ? "border-red-500 focus:border-red-500" : "border-border focus:border-accent"}`;
}

function inlineFieldClass(invalid?: boolean) {
  return `mt-1 w-full px-3 py-2 rounded-lg border text-sm font-body focus:outline-none transition-colors bg-surface ${invalid ? "border-red-500 focus:border-red-500" : "border-border focus:border-accent"}`;
}

export default function AdminClient({ initialOrgs, initialUsers }: { initialOrgs: OrgRow[]; initialUsers: UserRow[] }) {
  const [orgs, setOrgs] = useState(initialOrgs);
  const [users, setUsers] = useState(initialUsers);
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null);
  const [showAddOrg, setShowAddOrg] = useState(false);
  const [editingOrg, setEditingOrg] = useState<OrgRow | null>(null);
  const [archiveConfirmId, setArchiveConfirmId] = useState<string | null>(null);
  const [archiveUserConfirmId, setArchiveUserConfirmId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  // Add Org form
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [orgAttempted, setOrgAttempted] = useState(false);

  // Edit Org form
  const [editOrgName, setEditOrgName] = useState("");
  const [editOrgCode, setEditOrgCode] = useState("");
  const [editOrgEmail, setEditOrgEmail] = useState("");
  const [editOrgPhone, setEditOrgPhone] = useState("");
  const [editOrgAddress, setEditOrgAddress] = useState("");
  const [editOrgAttempted, setEditOrgAttempted] = useState(false);

  // Add User form
  const [showAddUser, setShowAddUser] = useState(false);
  const [userFormName, setUserFormName] = useState("");
  const [userFormEmail, setUserFormEmail] = useState("");
  const [userFormRole, setUserFormRole] = useState<"lab_manager" | "lab_employee">("lab_employee");
  const [userFormPassword, setUserFormPassword] = useState("");
  const [userFormShowPw, setUserFormShowPw] = useState(false);
  const [userAttempted, setUserAttempted] = useState(false);

  // Edit User form
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<"lab_manager" | "lab_employee">("lab_employee");
  const [editPassword, setEditPassword] = useState("");
  const [editConfirmPassword, setEditConfirmPassword] = useState("");
  const [editShowPw, setEditShowPw] = useState(false);
  const [editPwError, setEditPwError] = useState("");
  const [editAttempted, setEditAttempted] = useState(false);

  const [actionError, setActionError] = useState("");

  const activeOrgs = orgs.filter((o) => !o.archivedAt);
  const archivedOrgs = orgs.filter((o) => !!o.archivedAt);
  const displayedOrgs = showArchived ? orgs : activeOrgs;

  const orgUsers = (orgId: string) => users.filter((u) => u.orgId === orgId && !u.archivedAt);
  const archivedOrgUsers = (orgId: string) => users.filter((u) => u.orgId === orgId && !!u.archivedAt);

  // --- Add Org validation ---
  const orgNameErr = orgAttempted && !formName.trim() ? "Organization name is required" : "";
  const orgCodeErr = orgAttempted && !formCode.trim() ? "Code is required" : orgAttempted && formCode.length > 10 ? "Code must be 10 characters or less" : "";
  const orgEmailErr = orgAttempted && formEmail.trim() && !EMAIL_RE.test(formEmail) ? "Invalid email format" : "";
  const orgValid = formName.trim() && formCode.trim() && formCode.length <= 10 && (!formEmail.trim() || EMAIL_RE.test(formEmail));

  const handleAddOrg = async () => {
    setOrgAttempted(true);
    if (!orgValid) return;
    setActionError("");
    const result = await createOrganization({ name: formName, code: formCode, contactEmail: formEmail, phone: formPhone, address: formAddress });
    if (result.success && "org" in result) {
      setOrgs([...orgs, { ...result.org, createdAt: result.org.createdAt as unknown as string, archivedAt: null, _count: { users: 0, labTests: 0 } } as unknown as OrgRow]);
      setShowAddOrg(false);
      setFormName(""); setFormCode(""); setFormEmail(""); setFormPhone(""); setFormAddress(""); setOrgAttempted(false);
    } else if (!result.success && "error" in result) {
      setActionError(result.error);
    }
  };

  // --- Edit Org validation ---
  const editOrgNameErr = editOrgAttempted && !editOrgName.trim() ? "Organization name is required" : "";
  const editOrgCodeErr = editOrgAttempted && !editOrgCode.trim() ? "Code is required" : editOrgAttempted && editOrgCode.length > 10 ? "Code must be 10 characters or less" : "";
  const editOrgEmailErr = editOrgAttempted && editOrgEmail.trim() && !EMAIL_RE.test(editOrgEmail) ? "Invalid email format" : "";
  const editOrgValid = editOrgName.trim() && editOrgCode.trim() && editOrgCode.length <= 10 && (!editOrgEmail.trim() || EMAIL_RE.test(editOrgEmail));

  const openEditOrg = (org: OrgRow) => {
    setEditingOrg(org);
    setEditOrgName(org.name);
    setEditOrgCode(org.code);
    setEditOrgEmail(org.contactEmail || "");
    setEditOrgPhone(org.phone || "");
    setEditOrgAddress(org.address || "");
    setEditOrgAttempted(false);
    setActionError("");
  };

  const handleSaveOrg = async () => {
    setEditOrgAttempted(true);
    if (!editingOrg || !editOrgValid) return;
    setActionError("");
    const result = await updateOrganization({ id: editingOrg.id, name: editOrgName, code: editOrgCode, contactEmail: editOrgEmail, phone: editOrgPhone, address: editOrgAddress });
    if (result.success && "org" in result) {
      setOrgs(orgs.map((o) => (o.id === editingOrg.id ? { ...o, name: result.org.name, code: result.org.code, contactEmail: result.org.contactEmail, phone: result.org.phone, address: result.org.address } : o)));
      setEditingOrg(null);
    } else if (!result.success && "error" in result) {
      setActionError(result.error);
    }
  };

  const handleArchiveOrg = async (orgId: string) => {
    const result = await archiveOrganization(orgId);
    if (result.success) {
      const now = new Date().toISOString();
      setOrgs(orgs.map((o) => (o.id === orgId ? { ...o, archivedAt: now } : o)));
      setUsers(users.map((u) => (u.orgId === orgId && !u.archivedAt ? { ...u, archivedAt: now } : u)));
      setArchiveConfirmId(null);
      if (expandedOrg === orgId) setExpandedOrg(null);
    } else if ("error" in result) {
      setActionError(result.error);
      setArchiveConfirmId(null);
    }
  };

  const handleRestoreOrg = async (orgId: string) => {
    const result = await restoreOrganization(orgId);
    if (result.success) {
      setOrgs(orgs.map((o) => (o.id === orgId ? { ...o, archivedAt: null } : o)));
      setUsers(users.map((u) => (u.orgId === orgId ? { ...u, archivedAt: null } : u)));
    } else if ("error" in result) {
      setActionError(result.error);
    }
  };

  // --- Add User validation ---
  const userNameErr = userAttempted && !userFormName.trim() ? "Name is required" : "";
  const userEmailErr = userAttempted && !userFormEmail.trim() ? "Email is required" : userAttempted && !EMAIL_RE.test(userFormEmail) ? "Invalid email format" : "";
  const userPwErr = userAttempted && !userFormPassword ? "Password is required" : userAttempted && userFormPassword.length < 6 ? "Password must be at least 6 characters" : "";
  const userValid = userFormName.trim() && EMAIL_RE.test(userFormEmail) && userFormPassword.length >= 6;

  const handleAddUser = async () => {
    setUserAttempted(true);
    if (!expandedOrg || !userValid) return;
    setActionError("");
    const result = await createUser({ name: userFormName, email: userFormEmail, password: userFormPassword, role: userFormRole, orgId: expandedOrg });
    if (result.success && "user" in result) {
      setUsers([...users, { ...result.user, archivedAt: null } as UserRow]);
      setShowAddUser(false);
      setUserFormName(""); setUserFormEmail(""); setUserFormRole("lab_employee"); setUserFormPassword(""); setUserFormShowPw(false); setUserAttempted(false);
    } else if (!result.success && "error" in result) {
      setActionError(result.error);
    }
  };

  const openEditUser = (u: UserRow) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditRole(u.role as "lab_manager" | "lab_employee");
    setEditPassword(""); setEditConfirmPassword(""); setEditShowPw(false); setEditPwError(""); setEditAttempted(false);
  };

  // --- Edit User validation ---
  const editNameErr = editAttempted && !editName.trim() ? "Name is required" : "";
  const editEmailErr = editAttempted && !editEmail.trim() ? "Email is required" : editAttempted && !EMAIL_RE.test(editEmail) ? "Invalid email format" : "";
  const editPwLenErr = editAttempted && editPassword && editPassword.length < 6 ? "Password must be at least 6 characters" : "";
  const editPwMatchErr = editAttempted && editPassword && editPassword !== editConfirmPassword ? "Passwords do not match" : "";
  const editValid = editName.trim() && EMAIL_RE.test(editEmail) && (!editPassword || (editPassword.length >= 6 && editPassword === editConfirmPassword));

  const handleSaveUser = async () => {
    setEditAttempted(true);
    if (!editingUser || !editValid) return;
    setEditPwError("");
    const result = await updateUser({
      id: editingUser.id,
      name: editName,
      email: editEmail,
      role: editRole,
      ...(editPassword ? { password: editPassword } : {}),
    });
    if (result.success && "user" in result) {
      setUsers(users.map((u) => (u.id === editingUser.id ? { ...result.user, archivedAt: u.archivedAt } as UserRow : u)));
      setEditingUser(null);
    } else if (!result.success && "error" in result) {
      setEditPwError(result.error);
    }
  };

  const handleArchiveUser = async (userId: string) => {
    const result = await archiveUser(userId);
    if (result.success) {
      setUsers(users.map((u) => (u.id === userId ? { ...u, archivedAt: new Date().toISOString() } : u)));
      setArchiveUserConfirmId(null);
    } else if ("error" in result) {
      setActionError(result.error);
      setArchiveUserConfirmId(null);
    }
  };

  const handleRestoreUser = async (userId: string) => {
    const result = await restoreUser(userId);
    if (result.success) {
      setUsers(users.map((u) => (u.id === userId ? { ...u, archivedAt: null } : u)));
    } else if ("error" in result) {
      setActionError(result.error);
    }
  };

  const toggleOrg = (orgId: string) => {
    setExpandedOrg(expandedOrg === orgId ? null : orgId);
    setShowAddUser(false);
  };

  const activeUsers = users.filter((u) => !u.archivedAt);

  return (
    <div>
      <Header title="Organizations" />
      <div className="p-8">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mb-6 animate-fade-in">
          <div className="bg-surface-raised rounded-xl border border-border p-5">
            <p className="text-xs font-body font-medium text-text-muted uppercase tracking-wider">Organizations</p>
            <p className="font-mono text-3xl font-bold text-text-primary mt-2">{activeOrgs.length}</p>
          </div>
          <div className="bg-surface-raised rounded-xl border border-border p-5">
            <p className="text-xs font-body font-medium text-text-muted uppercase tracking-wider">Total Users</p>
            <p className="font-mono text-3xl font-bold text-text-primary mt-2">{activeUsers.length}</p>
          </div>
          <div className="bg-surface-raised rounded-xl border border-border p-5">
            <p className="text-xs font-body font-medium text-text-muted uppercase tracking-wider">Total Tests</p>
            <p className="font-mono text-3xl font-bold text-text-primary mt-2">{activeOrgs.reduce((sum, o) => sum + o._count.labTests, 0)}</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-base text-text-primary">All Organizations</h2>
          <div className="flex items-center gap-3">
            {archivedOrgs.length > 0 && (
              <button onClick={() => setShowArchived(!showArchived)}
                className={`px-3 py-2 rounded-lg text-xs font-body font-semibold transition-colors flex items-center gap-2 ${showArchived ? "bg-amber-500/10 text-amber-500 border border-amber-500/30" : "text-text-muted hover:text-text-secondary border border-border"}`}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>
                {showArchived ? `Hide Archived (${archivedOrgs.length})` : `Show Archived (${archivedOrgs.length})`}
              </button>
            )}
            <button onClick={() => { setActionError(""); setOrgAttempted(false); setShowAddOrg(true); }}
              className="px-4 py-2.5 rounded-lg bg-accent text-white text-sm font-body font-semibold hover:bg-accent-light transition-colors flex items-center gap-2">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
              Add Organization
            </button>
          </div>
        </div>

        {/* Org accordion list */}
        <div className="space-y-2">
          {displayedOrgs.map((org) => {
            const isExpanded = expandedOrg === org.id;
            const isArchived = !!org.archivedAt;
            const members = orgUsers(org.id);
            const archivedMembers = archivedOrgUsers(org.id);
            return (
              <div key={org.id} className={`bg-surface-raised rounded-xl border overflow-hidden transition-all ${isArchived ? "border-amber-500/30 opacity-75" : "border-border"}`}>
                <button onClick={() => toggleOrg(org.id)} className="w-full px-5 py-4 flex items-center justify-between hover:bg-surface transition-colors text-left">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${isArchived ? "bg-amber-500/5 border-amber-500/20" : "bg-surface border-border"}`}>
                      {isArchived ? (
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-amber-500">
                          <path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/>
                        </svg>
                      ) : (
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-accent">
                          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path d="M9 22V12h6v10"/>
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-display font-semibold ${isArchived ? "text-text-muted" : "text-text-primary"}`}>{org.name}</span>
                        {isArchived && <span className="text-[10px] font-body font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 uppercase tracking-wider">Archived</span>}
                      </div>
                      <div className="font-mono text-xs text-accent mt-0.5">{org.code}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <div className="text-xs font-body text-text-secondary">{members.length} user{members.length !== 1 ? "s" : ""} &middot; {org._count.labTests} tests</div>
                    </div>
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                      className={`text-text-muted transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}>
                      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border">
                    <div className="px-5 pt-4 pb-4">
                      <div className="flex items-start justify-between">
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 flex-1">
                          <div><p className="text-[11px] font-body font-medium text-text-muted uppercase tracking-wider">Email</p><p className="text-sm font-body text-text-secondary mt-0.5">{org.contactEmail || "—"}</p></div>
                          <div><p className="text-[11px] font-body font-medium text-text-muted uppercase tracking-wider">Phone</p><p className="text-sm font-body text-text-secondary mt-0.5">{org.phone || "—"}</p></div>
                          <div><p className="text-[11px] font-body font-medium text-text-muted uppercase tracking-wider">Code</p><p className="text-sm font-mono text-accent mt-0.5">{org.code}</p></div>
                          <div><p className="text-[11px] font-body font-medium text-text-muted uppercase tracking-wider">Address</p><p className="text-sm font-body text-text-secondary mt-0.5">{org.address || "—"}</p></div>
                        </div>
                        {!isArchived && (
                          <button onClick={() => openEditOrg(org)} title="Edit organization" className="p-1.5 text-text-muted hover:text-accent hover:bg-accent-muted rounded-lg transition-colors shrink-0 ml-2">
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="px-5 pb-5 border-t border-border pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-display font-semibold text-sm text-text-primary">Users &amp; Roles <span className="ml-2 font-mono text-xs text-text-muted font-normal">({members.length})</span></h4>
                        {!isArchived && (
                          <button onClick={() => { setActionError(""); setUserAttempted(false); setShowAddUser(!showAddUser); }}
                            className="px-3 py-1.5 text-xs font-body font-semibold text-accent hover:bg-accent-muted rounded-lg transition-colors flex items-center gap-1.5">
                            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
                            Add User
                          </button>
                        )}
                      </div>

                      {showAddUser && !isArchived && (
                        <div className="mb-3 p-4 rounded-xl border border-accent/30 bg-accent-muted/20 space-y-3">
                          <p className="text-xs font-body font-semibold text-text-secondary uppercase tracking-wider">New User</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-body text-text-muted">Full Name <span className="text-red-500">*</span></label>
                              <input value={userFormName} onChange={(e) => setUserFormName(e.target.value)} placeholder="Dr. Jane Smith"
                                className={inlineFieldClass(!!userNameErr)} />
                              {userNameErr && <p className="mt-1 text-xs text-red-500 font-body">{userNameErr}</p>}
                            </div>
                            <div>
                              <label className="text-xs font-body text-text-muted">Email <span className="text-red-500">*</span></label>
                              <input type="email" value={userFormEmail} onChange={(e) => setUserFormEmail(e.target.value)} placeholder="jane@example.com" autoComplete="off"
                                className={inlineFieldClass(!!userEmailErr)} />
                              {userEmailErr && <p className="mt-1 text-xs text-red-500 font-body">{userEmailErr}</p>}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-body text-text-muted">Role</label>
                              <select value={userFormRole} onChange={(e) => setUserFormRole(e.target.value as "lab_manager" | "lab_employee")}
                                className="mt-1 w-full px-3 py-2 rounded-lg border border-border text-sm font-body focus:outline-none focus:border-accent bg-surface">
                                <option value="lab_manager">Lab Manager</option>
                                <option value="lab_employee">Lab Employee</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-body text-text-muted">Password <span className="text-red-500">*</span></label>
                              <div className="relative mt-1">
                                <input type={userFormShowPw ? "text" : "password"} value={userFormPassword} onChange={(e) => setUserFormPassword(e.target.value)}
                                  placeholder="Min. 6 characters" autoComplete="new-password"
                                  className={`w-full px-3 py-2 pr-9 rounded-lg border text-sm font-body focus:outline-none transition-colors bg-surface ${userPwErr ? "border-red-500 focus:border-red-500" : "border-border focus:border-accent"}`} />
                                <button type="button" onClick={() => setUserFormShowPw(!userFormShowPw)}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary">
                                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                                  </svg>
                                </button>
                              </div>
                              {userPwErr && <p className="mt-1 text-xs text-red-500 font-body">{userPwErr}</p>}
                            </div>
                          </div>
                          {actionError && showAddUser && <p className="text-xs text-red-500 font-body">{actionError}</p>}
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => { setShowAddUser(false); setActionError(""); setUserAttempted(false); setUserFormName(""); setUserFormEmail(""); setUserFormRole("lab_employee"); setUserFormPassword(""); }}
                              className="px-3 py-1.5 text-xs font-body text-text-muted hover:text-text-primary rounded-lg transition-colors">Cancel</button>
                            <button onClick={handleAddUser}
                              className="px-4 py-1.5 text-xs font-body font-semibold bg-accent text-white rounded-lg hover:bg-accent-light transition-colors">Add User</button>
                          </div>
                        </div>
                      )}

                      {members.length > 0 ? (
                        <div className="border border-border rounded-xl overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-surface border-b border-border">
                                <th className="text-left px-4 py-2.5 text-[11px] font-body font-medium text-text-muted uppercase tracking-wider">Name</th>
                                <th className="text-left px-4 py-2.5 text-[11px] font-body font-medium text-text-muted uppercase tracking-wider">Email</th>
                                <th className="text-left px-4 py-2.5 text-[11px] font-body font-medium text-text-muted uppercase tracking-wider">Role</th>
                                <th className="text-right px-4 py-2.5 text-[11px] font-body font-medium text-text-muted uppercase tracking-wider">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {members.map((u) => (
                                <tr key={u.id} className="border-b border-border last:border-0">
                                  <td className="px-4 py-2.5 font-body text-text-primary">{u.name}</td>
                                  <td className="px-4 py-2.5 font-body text-text-secondary text-xs">{u.email}</td>
                                  <td className="px-4 py-2.5">
                                    <span className="text-xs font-body font-medium px-2 py-1 rounded-md bg-accent-muted text-accent">{getRoleName(u.role)}</span>
                                  </td>
                                  <td className="px-4 py-2.5 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <button onClick={() => openEditUser(u)} title="Edit user" className="p-1.5 text-text-muted hover:text-accent hover:bg-accent-muted rounded-lg transition-colors">
                                        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                      </button>
                                      <button onClick={() => setArchiveUserConfirmId(u.id)} title="Archive user" className="p-1.5 text-amber-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors">
                                        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="py-6 text-center text-sm text-text-muted font-body border border-dashed border-border rounded-xl">No users assigned yet.</div>
                      )}

                      {/* Archived users within this org */}
                      {archivedMembers.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-display font-semibold text-sm text-amber-500 mb-2">Archived Users <span className="ml-1 font-mono text-xs text-text-muted font-normal">({archivedMembers.length})</span></h4>
                          <div className="border border-amber-500/20 rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                              <tbody>
                                {archivedMembers.map((u) => (
                                  <tr key={u.id} className="border-b border-amber-500/10 last:border-0 opacity-60">
                                    <td className="px-4 py-2.5 font-body text-text-muted">{u.name}</td>
                                    <td className="px-4 py-2.5 font-body text-text-muted text-xs">{u.email}</td>
                                    <td className="px-4 py-2.5">
                                      <span className="text-xs font-body font-medium px-2 py-1 rounded-md bg-amber-500/10 text-amber-500">{getRoleName(u.role)}</span>
                                    </td>
                                    <td className="px-4 py-2.5 text-right">
                                      <button onClick={() => handleRestoreUser(u.id)} title="Restore user"
                                        className="px-2.5 py-1 text-xs font-body font-semibold text-accent hover:bg-accent-muted rounded-lg transition-colors">
                                        Restore
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      <div className="mt-4 pt-4 border-t border-border">
                        {isArchived ? (
                          <button onClick={() => handleRestoreOrg(org.id)}
                            className="px-4 py-2 rounded-lg border border-accent/40 text-accent text-xs font-body font-semibold hover:bg-accent-muted transition-colors flex items-center gap-2">
                            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 105.64-11.36L1 10"/></svg>
                            Restore Organization
                          </button>
                        ) : (
                          <button onClick={() => setArchiveConfirmId(org.id)}
                            className="px-4 py-2 rounded-lg border border-amber-500/40 text-amber-500 text-xs font-body font-semibold hover:bg-amber-500/10 transition-colors flex items-center gap-2">
                            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>
                            Archive Organization
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Archive Org Confirmation Modal */}
      <Modal open={!!archiveConfirmId} onClose={() => setArchiveConfirmId(null)} title="Archive Organization" width="max-w-md">
        {archiveConfirmId && (() => {
          const org = orgs.find((o) => o.id === archiveConfirmId);
          const affectedUsers = orgUsers(archiveConfirmId).length;
          return (
            <div className="space-y-4">
              <p className="text-sm font-body text-text-secondary">
                Are you sure you want to archive <span className="font-semibold text-text-primary">{org?.name}</span>?
                {affectedUsers > 0 && <> This will also archive <span className="font-semibold text-amber-500">{affectedUsers} user{affectedUsers > 1 ? "s" : ""}</span>.</>}
                {" "}Archived organizations and users cannot log in or use the API, but their data is preserved.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setArchiveConfirmId(null)}
                  className="flex-1 py-2.5 rounded-lg border border-border text-sm font-body font-semibold text-text-secondary hover:text-text-primary hover:border-text-secondary transition-colors">Cancel</button>
                <button onClick={() => handleArchiveOrg(archiveConfirmId)}
                  className="flex-1 py-2.5 rounded-lg bg-amber-500 text-white text-sm font-body font-semibold hover:bg-amber-600 transition-colors">Archive</button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Archive User Confirmation Modal */}
      <Modal open={!!archiveUserConfirmId} onClose={() => setArchiveUserConfirmId(null)} title="Archive User" width="max-w-md">
        {archiveUserConfirmId && (() => {
          const user = users.find((u) => u.id === archiveUserConfirmId);
          return (
            <div className="space-y-4">
              <p className="text-sm font-body text-text-secondary">
                Are you sure you want to archive <span className="font-semibold text-text-primary">{user?.name}</span> ({user?.email})? They will no longer be able to log in.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setArchiveUserConfirmId(null)}
                  className="flex-1 py-2.5 rounded-lg border border-border text-sm font-body font-semibold text-text-secondary hover:text-text-primary hover:border-text-secondary transition-colors">Cancel</button>
                <button onClick={() => handleArchiveUser(archiveUserConfirmId)}
                  className="flex-1 py-2.5 rounded-lg bg-amber-500 text-white text-sm font-body font-semibold hover:bg-amber-600 transition-colors">Archive</button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Edit User Modal */}
      <Modal open={!!editingUser} onClose={() => setEditingUser(null)} title="Edit User" width="max-w-md">
        {editingUser && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider">Full Name <span className="text-red-500">*</span></label>
              <input value={editName} onChange={(e) => setEditName(e.target.value)}
                className={fieldClass(!!editNameErr)} />
              {editNameErr && <p className="mt-1 text-xs text-red-500 font-body">{editNameErr}</p>}
            </div>
            <div>
              <label className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider">Email <span className="text-red-500">*</span></label>
              <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)}
                className={fieldClass(!!editEmailErr)} />
              {editEmailErr && <p className="mt-1 text-xs text-red-500 font-body">{editEmailErr}</p>}
            </div>
            <div>
              <label className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider">Role</label>
              <select value={editRole} onChange={(e) => setEditRole(e.target.value as "lab_manager" | "lab_employee")}
                className="mt-1 w-full px-4 py-2.5 rounded-lg border border-border text-sm font-body focus:outline-none focus:border-accent bg-surface">
                <option value="lab_manager">Lab Manager</option>
                <option value="lab_employee">Lab Employee</option>
              </select>
            </div>
            <div className="border-t border-border pt-4">
              <p className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider mb-3">
                New Password <span className="normal-case text-text-muted font-normal ml-1">— leave blank to keep current</span>
              </p>
              <div className="space-y-3">
                <div className="relative">
                  <input type={editShowPw ? "text" : "password"} value={editPassword} onChange={(e) => { setEditPassword(e.target.value); setEditPwError(""); }}
                    placeholder="Min. 6 characters"
                    className={`w-full px-4 py-2.5 pr-10 rounded-lg border text-sm font-body focus:outline-none transition-colors ${editPwLenErr ? "border-red-500 focus:border-red-500" : "border-border focus:border-accent"}`} />
                  <button type="button" onClick={() => setEditShowPw(!editShowPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary">
                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </div>
                {editPwLenErr && <p className="text-xs text-red-500 font-body">{editPwLenErr}</p>}
                <input type={editShowPw ? "text" : "password"} value={editConfirmPassword} onChange={(e) => { setEditConfirmPassword(e.target.value); setEditPwError(""); }}
                  placeholder="Confirm new password"
                  className={`w-full px-4 py-2.5 rounded-lg border text-sm font-body focus:outline-none transition-colors ${editPwMatchErr ? "border-red-500 focus:border-red-500" : "border-border focus:border-accent"}`} />
                {editPwMatchErr && <p className="text-xs text-red-500 font-body">{editPwMatchErr}</p>}
                {editPwError && <p className="text-xs text-red-500 font-body">{editPwError}</p>}
              </div>
            </div>
            <button onClick={handleSaveUser}
              className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-body font-semibold hover:bg-accent-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Save Changes</button>
          </div>
        )}
      </Modal>

      {/* Add Org Modal */}
      <Modal open={showAddOrg} onClose={() => setShowAddOrg(false)} title="Add Organization">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider">Organization Name <span className="text-red-500">*</span></label>
            <input value={formName} onChange={(e) => setFormName(e.target.value)}
              className={fieldClass(!!orgNameErr)} />
            {orgNameErr && <p className="mt-1 text-xs text-red-500 font-body">{orgNameErr}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider">Code <span className="text-red-500">*</span></label>
              <input value={formCode} onChange={(e) => setFormCode(e.target.value)} placeholder="e.g. LCE" maxLength={10}
                className={fieldClass(!!orgCodeErr) + " !font-mono"} />
              {orgCodeErr && <p className="mt-1 text-xs text-red-500 font-body">{orgCodeErr}</p>}
            </div>
            <div>
              <label className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider">Phone</label>
              <input value={formPhone} onChange={(e) => setFormPhone(e.target.value)}
                className={fieldClass()} />
            </div>
          </div>
          <div>
            <label className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider">Contact Email</label>
            <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)}
              className={fieldClass(!!orgEmailErr)} />
            {orgEmailErr && <p className="mt-1 text-xs text-red-500 font-body">{orgEmailErr}</p>}
          </div>
          <div>
            <label className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider">Address</label>
            <input value={formAddress} onChange={(e) => setFormAddress(e.target.value)}
              className={fieldClass()} />
          </div>
          {actionError && showAddOrg && <p className="text-xs text-red-500 font-body">{actionError}</p>}
          <button onClick={handleAddOrg}
            className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-body font-semibold hover:bg-accent-light transition-colors mt-2">
            Create Organization
          </button>
        </div>
      </Modal>

      {/* Edit Org Modal */}
      <Modal open={!!editingOrg} onClose={() => setEditingOrg(null)} title="Edit Organization">
        {editingOrg && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider">Organization Name <span className="text-red-500">*</span></label>
              <input value={editOrgName} onChange={(e) => setEditOrgName(e.target.value)}
                className={fieldClass(!!editOrgNameErr)} />
              {editOrgNameErr && <p className="mt-1 text-xs text-red-500 font-body">{editOrgNameErr}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider">Code <span className="text-red-500">*</span></label>
                <input value={editOrgCode} onChange={(e) => setEditOrgCode(e.target.value)} maxLength={10}
                  className={fieldClass(!!editOrgCodeErr) + " !font-mono"} />
                {editOrgCodeErr && <p className="mt-1 text-xs text-red-500 font-body">{editOrgCodeErr}</p>}
              </div>
              <div>
                <label className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider">Phone</label>
                <input value={editOrgPhone} onChange={(e) => setEditOrgPhone(e.target.value)}
                  className={fieldClass()} />
              </div>
            </div>
            <div>
              <label className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider">Contact Email</label>
              <input type="email" value={editOrgEmail} onChange={(e) => setEditOrgEmail(e.target.value)}
                className={fieldClass(!!editOrgEmailErr)} />
              {editOrgEmailErr && <p className="mt-1 text-xs text-red-500 font-body">{editOrgEmailErr}</p>}
            </div>
            <div>
              <label className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider">Address</label>
              <input value={editOrgAddress} onChange={(e) => setEditOrgAddress(e.target.value)}
                className={fieldClass()} />
            </div>
            {actionError && editingOrg && <p className="text-xs text-red-500 font-body">{actionError}</p>}
            <button onClick={handleSaveOrg}
              className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-body font-semibold hover:bg-accent-light transition-colors mt-2">
              Save Changes
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
