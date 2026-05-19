import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { withTenant } from "@/lib/db/client";
import { findAllTests } from "@/lib/db/queries/tests";
import CalculatorClient from "./calculator-client";

export default async function CalculatorPage() {
  const session = await auth();
  const user = session?.user as { role: string; orgId: string | null };
  if (!user?.orgId || !["lab_manager", "lab_employee"].includes(user.role)) redirect("/dashboard");
  const orgId = user.orgId;

  const { tests } = await withTenant(
    { orgId, role: user.role },
    () => findAllTests(orgId, { pageSize: 0 })
  );

  return <CalculatorClient initialTests={JSON.parse(JSON.stringify(tests))} />;
}
