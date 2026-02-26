"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/context/auth-context";

export default function DashboardIndex() {
  const { role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (role === "super_admin") router.replace("/dashboard/admin");
    else if (role === "lab_manager") router.replace("/dashboard/tests");
    else if (role === "lab_employee") router.replace("/dashboard/calculator");
  }, [role, router]);

  return null;
}
