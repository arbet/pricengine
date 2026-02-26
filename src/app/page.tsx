"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Role, organizations } from "@/data/mock-data";

const MOCK_CREDENTIALS: Record<Role, { username: string; password: string }> = {
  super_admin:  { username: "sarah.chen",    password: "admin123"   },
  lab_manager:  { username: "james.rivera",  password: "manager123" },
  lab_employee: { username: "lab.staff",     password: "staff123"   },
};

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<Role | "">("");
  const [selectedOrg, setSelectedOrg] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const router = useRouter();

  const needsOrg = selectedRole === "lab_manager" || selectedRole === "lab_employee";

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    setSelectedOrg("");
    setUsername(MOCK_CREDENTIALS[role].username);
    setPassword(MOCK_CREDENTIALS[role].password);
    setError("");
  };

  const handleLogin = () => {
    if (!selectedRole) return;
    if (needsOrg && !selectedOrg) return;
    const creds = MOCK_CREDENTIALS[selectedRole];
    if (username !== creds.username || password !== creds.password) {
      setError("Invalid username or password.");
      return;
    }
    login(selectedRole as Role, needsOrg ? selectedOrg : null);
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex">
      {/* Left branded panel */}
      <div className="hidden lg:flex lg:w-[55%] bg-sidebar login-grid relative overflow-hidden flex-col justify-between p-12">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/3 rounded-full blur-2xl -translate-x-1/3 translate-y-1/3" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="font-display font-bold text-white text-2xl tracking-tight">PriceEngine</span>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="font-display text-4xl font-bold text-white leading-tight mb-4">
            Laboratory Pricing,<br />
            <span className="text-accent-light">Precision Engineered.</span>
          </h1>
          <p className="text-white/70 font-body text-lg leading-relaxed">
            Multi-organization platform for test catalog management, pricing calculations, and profitability analytics.
          </p>

          {/* Stats */}
          <div className="mt-10 grid grid-cols-3 gap-6">
            {[
              { value: "3", label: "Organizations" },
              { value: "20+", label: "Lab Tests" },
              { value: "Real-time", label: "Calculations" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="font-mono text-2xl font-bold text-accent-light">{stat.value}</p>
                <p className="text-white/60 text-sm font-body mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-white/40 text-xs font-mono">v1.0 PROTOTYPE</p>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="font-display font-bold text-text-primary text-xl">PriceEngine</span>
          </div>

          <h2 className="font-display text-2xl font-bold text-text-primary mb-1">Sign in</h2>
          <p className="text-text-muted font-body text-sm mb-8">Select your role to access the platform</p>

          {/* Role selection */}
          <div className="space-y-3 mb-6">
            <label className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider">Role</label>
            <div className="space-y-2">
              {([
                { value: "super_admin", label: "Super Admin", desc: "Platform administration" },
                { value: "lab_manager", label: "Lab Manager", desc: "Tests, pricing, analytics, logs" },
                { value: "lab_employee", label: "Lab Employee", desc: "Pricing calculator access" },
              ] as const).map((r) => (
                <button
                  key={r.value}
                  onClick={() => handleRoleSelect(r.value)}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all duration-150 ${
                    selectedRole === r.value
                      ? "border-accent bg-accent-muted"
                      : "border-border hover:border-border-strong"
                  }`}
                >
                  <span className="block text-sm font-body font-medium text-text-primary">{r.label}</span>
                  <span className="block text-xs text-text-muted mt-0.5">{r.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Organization selection */}
          {needsOrg && (
            <div className="space-y-3 mb-6 animate-fade-in">
              <label className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider">
                Organization
              </label>
              <select
                value={selectedOrg}
                onChange={(e) => setSelectedOrg(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border-2 border-border bg-white text-sm font-body text-text-primary focus:outline-none focus:border-accent transition-colors appearance-none cursor-pointer"
              >
                <option value="">Select organization...</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Username & password */}
          {selectedRole && (
            <div className="space-y-3 mb-6 animate-fade-in">

              <div>
                <label className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(""); }}
                  placeholder="Enter username"
                  className="mt-1.5 w-full px-4 py-3 rounded-lg border-2 border-border bg-white text-sm font-body text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="Enter password"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  className="mt-1.5 w-full px-4 py-3 rounded-lg border-2 border-border bg-white text-sm font-body text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              {error && (
                <p className="text-xs text-danger font-body">{error}</p>
              )}
            </div>
          )}

          {/* Login button */}
          <button
            onClick={handleLogin}
            disabled={!selectedRole || (needsOrg && !selectedOrg) || !username || !password}
            className="w-full py-3 px-4 rounded-lg bg-accent text-white font-body font-semibold text-sm hover:bg-accent-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-4"
          >
            Enter Platform
          </button>

          <p className="text-center text-xs text-text-muted mt-6 font-body">
            Interactive prototype &middot; No real authentication
          </p>
        </div>
      </div>
    </div>
  );
}
