"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password.");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
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

        <p className="relative z-10 text-white/40 text-xs font-mono">v1.0</p>
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
          <p className="text-text-muted font-body text-sm mb-8">Enter your credentials to access the platform</p>

          <div className="space-y-4 mb-6">
            <div>
              <label className="text-xs font-body font-medium text-text-secondary uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder="you@company.com"
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

          {/* Login button */}
          <button
            onClick={handleLogin}
            disabled={!email || !password || loading}
            className="w-full py-3 px-4 rounded-lg bg-accent text-white font-body font-semibold text-sm hover:bg-accent-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-4"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
}
