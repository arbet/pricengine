"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: string[];
}

const FlaskIcon = (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path d="M9 3h6M12 3v7l-5.5 8.5a2 2 0 001.7 3h11.6a2 2 0 001.7-3L14 10V3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CalcIcon = (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <path d="M8 6h8M8 10h2M14 10h2M8 14h2M14 14h2M8 18h2M14 18h2" strokeLinecap="round" />
  </svg>
);

const LogsIcon = (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 12h6M9 16h6" strokeLinecap="round" />
  </svg>
);

const ChartIcon = (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7 16l4-4 4 2 5-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const AdminIcon = (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path d="M19 21v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const navItems: NavItem[] = [
  { label: "Test Management", href: "/dashboard/tests", icon: FlaskIcon, roles: ["lab_manager"] },
  { label: "Pricing Calculator", href: "/dashboard/calculator", icon: CalcIcon, roles: ["lab_manager", "lab_employee"] },
  { label: "Logs", href: "/dashboard/logs", icon: LogsIcon, roles: ["lab_manager"] },
  { label: "Analytics", href: "/dashboard/analytics", icon: ChartIcon, roles: ["lab_manager"] },
  { label: "Organizations", href: "/dashboard/admin", icon: AdminIcon, roles: ["super_admin"] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { role, logout } = useAuth();

  const visibleItems = navItems.filter((item) => role && item.roles.includes(role));

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[260px] bg-sidebar flex flex-col z-40">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <span className="font-display font-bold text-white text-lg tracking-tight">PriceEngine</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleItems.map((item, i) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body transition-all duration-150
                animate-slide-in stagger-${i + 1} opacity-0
                ${isActive
                  ? "bg-sidebar-active text-white"
                  : "text-white/60 hover:text-white hover:bg-sidebar-hover"
                }
              `}
            >
              <span className={isActive ? "text-accent-light" : ""}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/5">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-body text-white/40 hover:text-white hover:bg-sidebar-hover transition-all"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
