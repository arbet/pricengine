import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";

export default async function DashboardIndex() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;

  if (role === "super_admin") redirect("/dashboard/admin");
  else if (role === "lab_manager") redirect("/dashboard/tests");
  else if (role === "lab_employee") redirect("/dashboard/calculator");
  else redirect("/");
}
