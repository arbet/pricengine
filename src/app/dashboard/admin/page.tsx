"use client";

import { useState } from "react";
import Header from "@/components/header";
import Modal from "@/components/modal";
import { organizations, mockUsers, Organization, User, Role, getRoleName } from "@/data/mock-data";

export default function AdminPage() {
  const [orgs, setOrgs] = useState<Organization[]>(organizations);
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [showAddOrg, setShowAddOrg] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Add org form
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");

  // Add user form (inside org detail)
  const [showAddUser, setShowAddUser] = useState(false);
  const [userFormName, setUserFormName] = useState("");
  const [userFormEmail, setUserFormEmail] = useState("");
  const [userFormRole, setUserFormRole] = useState<Role>("lab_employee");
  const [userFormPassword, setUserFormPassword] = useState("");
  const [userFormShowPw, setUserFormShowPw] = useState(false);

  // Edit user modal
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<Role>("lab_employee");
  const [editPassword, setEditPassword] = useState("");
  const [editConfirmPassword, setEditConfirmPassword] = useState("");
  const [editShowPw, setEditShowPw] = useState(false);
  const [editPwError, setEditPwError] = useState("");

  const orgUsers = (orgId: string) => users.filter((u) => u.orgId === orgId);

  // ── Org actions ──────────────────────────────────────────────────────────────

  const handleAddOrg = () => {
    const newOrg: Organization = {
      id: `org-${Date.now()}`,
      name: formName,
      code: formCode.toUpperCase(),
      contactEmail: formEmail,
      phone: formPhone,
      address: formAddress,
      createdAt: new Date().toISOString().split("T")[0],
      testsCount: 0,
      usersCount: 0,
    };
    setOrgs([...orgs, newOrg]);
    setShowAddOrg(false);
    setFormName(""); setFormCode(""); setFormEmail(""); setFormPhone(""); setFormAddress("");
  };

  const handleDeleteOrg = (orgId: string) => {
    setOrgs(orgs.filter((o) => o.id !== orgId));
    setUsers(users.filter((u) => u.orgId !== orgId));
    setDeleteConfirmId(null);
    if (selectedOrg?.id === orgId) setSelectedOrg(null);
  };

  // ── User actions ─────────────────────────────────────────────────────────────

  const handleAddUser = () => {
    if (!selectedOrg) return;
    const newUser: User = {
      id: `u-${Date.now()}`,
      name: userFormName,
      email: userFormEmail,
      ...(userFormPassword ? { password: userFormPassword } : {}),
      role: userFormRole,
      orgId: selectedOrg.id,
    };
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    setOrgs(orgs.map((o) =>
      o.id === selectedOrg.id
        ? { ...o, usersCount: updatedUsers.filter((u) => u.orgId === o.id).length }
        : o
    ));
    setSelectedOrg({ ...selectedOrg, usersCount: updatedUsers.filter((u) => u.orgId === selectedOrg.id).length });
    setShowAddUser(false);
    setUserFormName(""); setUserFormEmail(""); setUserFormRole("lab_employee");
    setUserFormPassword(""); setUserFormShowPw(false);
  };

  const openEditUser = (u: User) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditRole(u.role);
    setEditPassword("");
    setEditConfirmPassword("");
    setEditShowPw(false);
    setEditPwError("");
  };

  const handleSaveUser = () => {
    if (!editingUser) return;
    if (editPassword && editPassword !== editConfirmPassword) {
      setEditPwError("Passwords do not match.");
      return;
    }
    setUsers(users.map((u) =>
      u.id === editingUser.id
        ? {
            ...u,
            name: editName,
            email: editEmail,
            role: editRole,
            ...(editPassword ? { password: editPassword } : {}),
          }
        : u
    ));
    setEditingUser(null);
  };

  const handleChangeRole = (userId: string, newRole: Role) => {
    setUsers(users.map((u) => u.id === userId ? { ...u, role: newRole } : u));
  };

  const handleRemoveUser = (userId: string) => {
    const updatedUsers = users.filter((u) => u.id !== userId);
    setUsers(updatedUsers);
    if (selectedOrg) {
      const newCount = updatedUsers.filter((u) => u.orgId === selectedOrg.id).length;
      setOrgs(orgs.map((o) => o.id === selectedOrg.id ? { ...o, usersCount: newCount } : o));
      setSelectedOrg({ ...selectedOrg, usersCount: newCount });
    }
  };

  const totalUsers = users.filter((u) => u.role !== "super_admin").length;

  return (
    <div>
      <Header title="Organizations" />
      <div className="p-8">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mb-6 animate-fade-in">
          <div className="bg-surface-raised rounded-xl border border-border p-5">
            <p className="text-xs font-body font-medium text-text-muted uppercase tracking-wider">Organizations</p>
            <p className="font-mono text-3xl font-bold text-text-primary mt-2">{orgs.length}</p>
          </div>
          <div className="bg-surface-raised rounded-xl border border-border p-5">
            <p className="text-xs font-body font-medium text-text-muted uppercase tracking-wider">Total Users</p>
            <p className="font-mono text-3xl font-bold text-text-primary mt-2">{totalUsers}</p>
          </div>
          <div className="bg-surface-raised rounded-xl border border-border p-5">
            <p className="text-xs font-body font-medium text-text-muted uppercase tracking-wider">Total Tests</p>
            <p className="font-mono text-3xl font-bold text-text-primary mt-2">{orgs.reduce((sum, o) => sum + o.testsCount, 0)}</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4 animate-fade-in stagger-1 opacity-0">
          <h2 className="font-display font-semibold text-base text-text-primary">All Organizations</h2>
          <button
            onClick={() => setShowAddOrg(true)}
            className="px-4 py-2.5 rounded-lg bg-accent text-white text-sm font-body font-semibold hover:bg-accent-light transition-colors flex items-center gap-2"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Add Organization
          </button>
        </div>

        {/* Org grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 animate-fade-in stagger-2 opacity-0">
          {orgs.map((org) => (
            <div
              key={org.id}
              className="bg-surface-raised rounded-xl border border-border p-5 hover:border-accent transition-all hover:shadow-sm"
            >
              <div
                onClick={() => setSelectedOrg(org)}
                className="cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-display font-semibold text-text-primary">{org.name}</h3>
                    <span className="font-mono text-xs text-accent font-medium">{org.code}</span>
                  </div>
                  <span className="text-xs font-mono px-2 py-1 rounded-md bg-surface text-text-muted">{org.id}</span>
                </div>
                <div className="space-y-1.5 text-sm font-body text-text-secondary">
                  <p className="flex items-center gap-2">
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg>
                    {org.contactEmail}
                  </p>
                  <p className="flex items-center gap-2">
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                    {org.phone}
                  </p>
                </div>
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border">
                  <span className="text-xs font-body text-text-muted">{org.testsCount} tests</span>
                  <span className="text-xs font-body text-text-muted">{orgUsers(org.id).length} users</span>
                  <span className="text-xs font-body text-text-muted">Since {org.createdAt}</span>
                </div>
              </div>
              {/* Card actions */}
              <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-border">
                <button
                  onClick={() => setSelectedOrg(org)}
                  className="px-3 py-1.5 text-xs font-body font-medium text-accent hover:bg-accent-muted rounded-lg transition-colors"
                >
                  Manage
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(org.id); }}
                  className="px-3 py-1.5 text-xs font-body font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-1"
                >
                  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Org Detail / User Management Modal ── */}
      <Modal open={!!selectedOrg} onClose={() => { setSelectedOrg(null); setShowAddUser(false); }} title={selectedOrg?.name || ""} width="max-w-2xl">
        {selectedOrg && (
          <div className="space-y-6">
            {/* Org info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-body text-text-muted uppercase mb-1">Code</p>
                <p className="font-mono text-sm text-text-primary">{selectedOrg.code}</p>
              </div>
              <div>
                <p className="text-xs font-body text-text-muted uppercase mb-1">Created</p>
                <p className="text-sm font-body text-text-primary">{selectedOrg.createdAt}</p>
              </div>
              <div>
                <p className="text-xs font-body text-text-muted uppercase mb-1">Email</p>
                <p className="text-sm font-body text-text-primary">{selectedOrg.contactEmail}</p>
              </div>
              <div>
                <p className="text-xs font-body text-text-muted uppercase mb-1">Phone</p>
                <p className="text-sm font-body text-text-primary">{selectedOrg.phone}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-body text-text-muted uppercase mb-1">Address</p>
                <p className="text-sm font-body text-text-primary">{selectedOrg.address}</p>
              </div>
            </div>

            {/* Users section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-display font-semibold text-sm text-text-primary">
                  Users &amp; Roles
                  <span className="ml-2 font-mono text-xs text-text-muted font-normal">({orgUsers(selectedOrg.id).length})</span>
                </h4>
                <button
                  onClick={() => setShowAddUser(!showAddUser)}
                  className="px-3 py-1.5 text-xs font-body font-semibold text-accent hover:bg-accent-muted rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                  </svg>
                  Add User
                </button>
              </div>

              {/* Add user inline form */}
              {showAddUser && (
                <div className="mb-3 p-4 rounded-xl border border-accent/30 bg-accent-muted/20 space-y-3">
                  <p className="text-xs font-body font-semibold text-text-secondary uppercase tracking-wider">New User</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-body text-text-muted">Full Name</label>
                      <input
                        value={userFormName}
                        onChange={(e) => setUserFormName(e.target.value)}
                        placeholder="Dr. Jane Smith"
                        className="mt-1 w-full px-3 py-2 rounded-lg border border-border text-sm font-body focus:outline-none focus:border-accent bg-surface"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-body text-text-muted">Email</label>
                      <input
                        type="email"
                        value={userFormEmail}
                        onChange={(e) => setUserFormEmail(e.target.value)}
                        placeholder="jane@example.com"
                        autoComplete="off"
                        className="mt-1 w-full px-3 py-2 rounded-lg border border-border text-sm font-body focus:outline-none focus:border-accent bg-surface"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-body text-text-muted">Role</label>
                      <select
                        value={userFormRole}
                        onChange={(e) => setUserFormRole(e.target.value as Role)}
                        className="mt-1 w-full px-3 py-2 rounded-lg border border-border text-sm font-body focus:outline-none focus:border-accent bg-surface"
                      >
                        <option value="lab_manager">Lab Manager</option>
                        <option value="lab_employee">Lab Employee</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-body text-text-muted">Password</label>
                      <div className="relative mt-1">
                        <input
                          type={userFormShowPw ? "text" : "password"}
                          value={userFormPassword}
                          onChange={(e) => setUserFormPassword(e.target.value)}
                          placeholder="Optional"
                          autoComplete="new-password"
                          className="w-full px-3 py-2 pr-9 rounded-lg border border-border text-sm font-body focus:outline-none focus:border-accent bg-surface"
                        />
                        <button
                          type="button"
                          onClick={() => setUserFormShowPw(!userFormShowPw)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                        >
                          {userFormShowPw
                            ? <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                            : <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          }
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => { setShowAddUser(false); setUserFormName(""); setUserFormEmail(""); setUserFormRole("lab_employee"); setUserFormPassword(""); setUserFormShowPw(false); }}
                      className="px-3 py-1.5 text-xs font-body text-text-muted hover:text-text-primary rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddUser}
                      disabled={!userFormName.trim() || !userFormEmail.trim()}
                      className="px-4 py-1.5 text-xs font-body font-semibold bg-accent text-white rounded-lg hover:bg-accent-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Add User
                    </button>
                  </div>
                </div>
              )}

              {/* User list */}
              <div className="space-y-2">
                {orgUsers(selectedOrg.id).length > 0 ? (
                  orgUsers(selectedOrg.id).map((u) => (
                    <div key={u.id} className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-surface border border-border group">
                      <div className="min-w-0">
                        <span className="text-sm font-body text-text-primary">{u.name}</span>
                        <span className="text-xs font-body text-text-muted ml-2">{u.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 ml-3 shrink-0">
                        <span className="text-xs font-body font-medium px-2 py-1 rounded-md bg-accent-muted text-accent">
                          {getRoleName(u.role)}
                        </span>
                        <button
                          onClick={() => openEditUser(u)}
                          title="Edit user"
                          className="opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-accent hover:bg-accent-muted rounded-md transition-all"
                        >
                          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleRemoveUser(u.id)}
                          title="Remove user"
                          className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all"
                        >
                          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-text-muted font-body">No users assigned yet.</p>
                )}
              </div>
            </div>

            {/* Danger zone */}
            <div className="border-t border-border pt-4">
              <button
                onClick={() => { setSelectedOrg(null); setDeleteConfirmId(selectedOrg.id); }}
                className="w-full py-2.5 rounded-lg border border-red-500/40 text-red-500 text-sm font-body font-semibold hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
              >
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
                Delete Organization
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Delete Confirmation Modal ── */}
      <Modal
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Organization"
        width="max-w-md"
      >
        {deleteConfirmId && (() => {
          const org = orgs.find((o) => o.id === deleteConfirmId);
          const affectedUsers = orgUsers(deleteConfirmId).length;
          return (
            <div className="space-y-4">
              <p className="text-sm font-body text-text-secondary">
                Are you sure you want to delete <span className="font-semibold text-text-primary">{org?.name}</span>?
                This will permanently remove the organization
                {affectedUsers > 0 && (
                  <> and <span className="font-semibold text-red-400">{affectedUsers} user{affectedUsers > 1 ? "s" : ""}</span></>
                )}.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-2.5 rounded-lg border border-border text-sm font-body font-semibold text-text-secondary hover:text-text-primary hover:border-text-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteOrg(deleteConfirmId)}
                  className="flex-1 py-2.5 rounded-lg bg-red-500 text-white text-sm font-body font-semibold hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── Edit User Modal ── */}
      <Modal
        open={!!editingUser}
        onClose={() => setEditingUser(null)}
        title="Edit User"
        width="max-w-md"
      >
        {editingUser && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider">Full Name</label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-1 w-full px-4 py-2.5 rounded-lg border border-border text-sm font-body focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="mt-1 w-full px-4 py-2.5 rounded-lg border border-border text-sm font-body focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider">Role</label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as Role)}
                className="mt-1 w-full px-4 py-2.5 rounded-lg border border-border text-sm font-body focus:outline-none focus:border-accent bg-surface"
              >
                <option value="lab_manager">Lab Manager</option>
                <option value="lab_employee">Lab Employee</option>
              </select>
            </div>
            <div className="border-t border-border pt-4">
              <p className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider mb-3">
                New Password
                <span className="normal-case text-text-muted font-normal ml-1">
                  — leave blank to keep current
                  {editingUser.password && <span className="ml-1 text-green-500">&#10003; password set</span>}
                </span>
              </p>
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type={editShowPw ? "text" : "password"}
                    value={editPassword}
                    onChange={(e) => { setEditPassword(e.target.value); setEditPwError(""); }}
                    placeholder="New password"
                    className="w-full px-4 py-2.5 pr-10 rounded-lg border border-border text-sm font-body focus:outline-none focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={() => setEditShowPw(!editShowPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                  >
                    {editShowPw
                      ? <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
                <input
                  type={editShowPw ? "text" : "password"}
                  value={editConfirmPassword}
                  onChange={(e) => { setEditConfirmPassword(e.target.value); setEditPwError(""); }}
                  placeholder="Confirm new password"
                  className="w-full px-4 py-2.5 rounded-lg border border-border text-sm font-body focus:outline-none focus:border-accent"
                />
                {editPwError && (
                  <p className="text-xs text-red-500 font-body">{editPwError}</p>
                )}
              </div>
            </div>
            <button
              onClick={handleSaveUser}
              disabled={!editName.trim() || !editEmail.trim()}
              className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-body font-semibold hover:bg-accent-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Save Changes
            </button>
          </div>
        )}
      </Modal>

      {/* ── Add Org Modal ── */}
      <Modal open={showAddOrg} onClose={() => setShowAddOrg(false)} title="Add Organization">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider">Organization Name</label>
            <input value={formName} onChange={(e) => setFormName(e.target.value)} className="mt-1 w-full px-4 py-2.5 rounded-lg border border-border text-sm font-body focus:outline-none focus:border-accent" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider">Code</label>
              <input value={formCode} onChange={(e) => setFormCode(e.target.value)} placeholder="e.g. LCE" className="mt-1 w-full px-4 py-2.5 rounded-lg border border-border text-sm font-mono focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider">Phone</label>
              <input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} className="mt-1 w-full px-4 py-2.5 rounded-lg border border-border text-sm font-body focus:outline-none focus:border-accent" />
            </div>
          </div>
          <div>
            <label className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider">Contact Email</label>
            <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className="mt-1 w-full px-4 py-2.5 rounded-lg border border-border text-sm font-body focus:outline-none focus:border-accent" />
          </div>
          <div>
            <label className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider">Address</label>
            <input value={formAddress} onChange={(e) => setFormAddress(e.target.value)} className="mt-1 w-full px-4 py-2.5 rounded-lg border border-border text-sm font-body focus:outline-none focus:border-accent" />
          </div>
          <button
            onClick={handleAddOrg}
            disabled={!formName.trim() || !formCode.trim()}
            className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-body font-semibold hover:bg-accent-light transition-colors mt-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create Organization
          </button>
        </div>
      </Modal>
    </div>
  );
}
