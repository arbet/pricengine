import { auth } from "@/lib/auth/config";
import { findAllTests } from "@/lib/db/queries/tests";
import CalculatorClient from "./calculator-client";

export default async function CalculatorPage() {
  const session = await auth();
  const user = session?.user as { orgId: string | null };
  if (!user?.orgId) return null;

  const { tests } = await findAllTests(user.orgId);

  return <CalculatorClient initialTests={JSON.parse(JSON.stringify(tests))} />;
}
