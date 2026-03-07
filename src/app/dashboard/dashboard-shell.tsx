"use client";

import Sidebar from "@/components/sidebar";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="ml-[260px]">{children}</main>
    </div>
  );
}
