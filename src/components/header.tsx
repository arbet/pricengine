"use client";

import { useAuth } from "@/context/auth-context";
import { getRoleName } from "@/data/mock-data";

export default function Header({ title }: { title: string }) {
  const { role, userName, organization } = useAuth();

  return (
    <header className="h-16 border-b border-border bg-surface-raised flex items-center justify-between px-8">
      <h1 className="font-display font-semibold text-xl text-text-primary">{title}</h1>
      <div className="flex items-center gap-4">
        {organization && (
          <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-accent-muted text-accent font-medium">
            {organization.code}
          </span>
        )}
        <div className="text-right">
          <p className="text-sm font-body font-medium text-text-primary">{userName}</p>
          <p className="text-xs font-body text-text-muted">{role && getRoleName(role)}</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center">
          <span className="text-sm font-display font-semibold text-accent">
            {userName?.charAt(0) ?? "?"}
          </span>
        </div>
      </div>
    </header>
  );
}
