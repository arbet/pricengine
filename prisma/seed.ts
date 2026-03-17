import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

const RLS_TABLES = ["organizations", "users", "lab_tests", "panels", "panel_tests", "pricing_logs"];

async function disableRLS(pool: Pool) {
  for (const table of RLS_TABLES) {
    await pool.query(`ALTER TABLE "${table}" DISABLE ROW LEVEL SECURITY`);
  }
}

async function enableRLS(pool: Pool) {
  for (const table of RLS_TABLES) {
    await pool.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
  }
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Temporarily disable RLS for seeding
  await disableRLS(pool);

  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  // --- Organizations ---
  const org1 = await prisma.organization.upsert({
    where: { code: "LCE" },
    update: {},
    create: {
      name: "LabCorp East",
      code: "LCE",
      contactEmail: "admin@labcorpeast.com",
      phone: "(555) 234-5678",
      address: "1200 Medical Center Dr, Raleigh, NC 27610",
      discountFactor: 0.5,
      floorMultiplier: 3.0,
      marginalOverhead: 5.0,
      donationPerPanel: 2.0,
      revenueSharePerPanel: 3.0,
      overheadCost: 2500,
      panelsPerDay: 50,
      futureOverheadCost: 3500,
      futurePanelsPerDay: 80,
      apiKey: "lce-api-key-2026-secret",
    },
  });

  const org2 = await prisma.organization.upsert({
    where: { code: "MTD" },
    update: {},
    create: {
      name: "Metro Diagnostics",
      code: "MTD",
      contactEmail: "ops@metrodiag.com",
      phone: "(555) 876-5432",
      address: "450 Lab Parkway, Chicago, IL 60601",
      discountFactor: 0.45,
      floorMultiplier: 3.0,
      marginalOverhead: 6.0,
      donationPerPanel: 2.5,
      revenueSharePerPanel: 3.5,
      apiKey: "mtd-api-key-2026-secret",
    },
  });

  const org3 = await prisma.organization.upsert({
    where: { code: "PCL" },
    update: {},
    create: {
      name: "Pacific Labs",
      code: "PCL",
      contactEmail: "info@pacificlabs.com",
      phone: "(555) 321-9876",
      address: "789 Coastal Blvd, San Diego, CA 92101",
      discountFactor: 0.5,
      floorMultiplier: 2.8,
      marginalOverhead: 4.5,
      donationPerPanel: 1.5,
      revenueSharePerPanel: 2.5,
      apiKey: "pcl-api-key-2026-secret",
    },
  });

  // --- Users ---
  const pw = (plain: string) => hashSync(plain, 10);

  await prisma.user.upsert({
    where: { email: "admin@pricengine.com" },
    update: {},
    create: {
      name: "Sarah Chen",
      email: "admin@pricengine.com",
      passwordHash: pw("admin123"),
      role: "super_admin",
      orgId: null,
    },
  });

  await prisma.user.upsert({
    where: { email: "sarah@labcorp.com" },
    update: {},
    create: {
      name: "Dr. James Rivera",
      email: "sarah@labcorp.com",
      passwordHash: pw("manager123"),
      role: "lab_manager",
      orgId: org1.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "staff@labcorp.com" },
    update: {},
    create: {
      name: "Lab Staff",
      email: "staff@labcorp.com",
      passwordHash: pw("staff123"),
      role: "lab_employee",
      orgId: org1.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "mike@metro.com" },
    update: {},
    create: {
      name: "Dr. Aisha Patel",
      email: "mike@metro.com",
      passwordHash: pw("manager123"),
      role: "lab_manager",
      orgId: org2.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "staff@metro.com" },
    update: {},
    create: {
      name: "Lab Staff",
      email: "staff@metro.com",
      passwordHash: pw("staff123"),
      role: "lab_employee",
      orgId: org2.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "manager@pacific.com" },
    update: {},
    create: {
      name: "Dr. Michael Tanaka",
      email: "manager@pacific.com",
      passwordHash: pw("manager123"),
      role: "lab_manager",
      orgId: org3.id,
    },
  });

  // --- Lab Tests (org1) ---
  const testData = [
    { testId: "T-001", name: "Complete Blood Count (CBC)", reagentCost: 4.5, listPrice: 45.0, category: "Hematology" },
    { testId: "T-002", name: "Basic Metabolic Panel (BMP)", reagentCost: 6.2, listPrice: 65.0, category: "Chemistry" },
    { testId: "T-003", name: "Comprehensive Metabolic Panel (CMP)", reagentCost: 8.75, listPrice: 95.0, category: "Chemistry" },
    { testId: "T-004", name: "Lipid Panel", reagentCost: 5.3, listPrice: 55.0, category: "Chemistry" },
    { testId: "T-005", name: "Thyroid Stimulating Hormone (TSH)", reagentCost: 12.4, listPrice: 120.0, category: "Endocrinology" },
    { testId: "T-006", name: "Hemoglobin A1c", reagentCost: 8.9, listPrice: 85.0, category: "Endocrinology" },
    { testId: "T-007", name: "Urinalysis", reagentCost: 2.1, listPrice: 25.0, category: "Urinalysis" },
    { testId: "T-008", name: "Prothrombin Time (PT/INR)", reagentCost: 6.8, listPrice: 70.0, category: "Coagulation" },
    { testId: "T-009", name: "CBC with Differential", reagentCost: 7.5, listPrice: 75.0, category: "Hematology" },
    { testId: "T-010", name: "Liver Function Panel (LFP)", reagentCost: 9.2, listPrice: 105.0, category: "Chemistry" },
    { testId: "T-011", name: "Vitamin D, 25-Hydroxy", reagentCost: 18.5, listPrice: 180.0, category: "Immunoassay" },
    { testId: "T-012", name: "Iron Studies Panel", reagentCost: 11.3, listPrice: 110.0, category: "Chemistry" },
    { testId: "T-013", name: "C-Reactive Protein (CRP)", reagentCost: 7.4, listPrice: 72.0, category: "Immunoassay" },
    { testId: "T-014", name: "Erythrocyte Sedimentation Rate (ESR)", reagentCost: 3.2, listPrice: 30.0, category: "Hematology" },
    { testId: "T-015", name: "Blood Glucose (Fasting)", reagentCost: 2.8, listPrice: 28.0, category: "Chemistry" },
    { testId: "T-016", name: "Troponin I", reagentCost: 22.5, listPrice: 220.0, category: "Cardiac" },
    { testId: "T-017", name: "B-Type Natriuretic Peptide (BNP)", reagentCost: 25.0, listPrice: 245.0, category: "Cardiac" },
    { testId: "T-018", name: "Ferritin", reagentCost: 9.8, listPrice: 95.0, category: "Immunoassay" },
    { testId: "T-019", name: "Phosphorus", reagentCost: 3.5, listPrice: 35.0, category: "Chemistry" },
    { testId: "T-020", name: "Magnesium", reagentCost: 4.1, listPrice: 40.0, category: "Chemistry" },
  ];

  const createdTests: Record<string, string> = {};

  for (const t of testData) {
    const test = await prisma.labTest.upsert({
      where: { testId_orgId: { testId: t.testId, orgId: org1.id } },
      update: {},
      create: { ...t, orgId: org1.id },
    });
    createdTests[t.testId] = test.id;
  }

  // --- Panels (org1) ---
  const panelDefs = [
    { name: "Basic Panel", tests: ["T-001", "T-002", "T-004"] },
    { name: "Cardiac Panel", tests: ["T-016", "T-017"] },
    { name: "Metabolic + Thyroid", tests: ["T-003", "T-005", "T-006"] },
    { name: "Comprehensive", tests: ["T-003", "T-010", "T-012", "T-005"] },
  ];

  for (const pd of panelDefs) {
    const existing = await prisma.panel.findFirst({
      where: { name: pd.name, orgId: org1.id },
    });
    if (!existing) {
      await prisma.panel.create({
        data: {
          name: pd.name,
          orgId: org1.id,
          panelTests: {
            create: pd.tests.map((tid) => ({
              testId: createdTests[tid],
            })),
          },
        },
      });
    }
  }

  // --- Pricing Logs (org1) ---
  const logDefs = [
    { tests: ["T-001", "T-002", "T-004"], price: 112.85, source: "calculator" as const, ts: "2026-02-25T14:32:00Z" },
    { tests: ["T-016", "T-017"], price: 378.50, source: "api" as const, ts: "2026-02-25T11:15:00Z" },
    { tests: ["T-003", "T-005", "T-006"], price: 218.30, source: "calculator" as const, ts: "2026-02-24T16:45:00Z" },
    { tests: ["T-001"], price: 45.00, source: "calculator" as const, ts: "2026-02-24T09:20:00Z" },
    { tests: ["T-010", "T-012", "T-018"], price: 225.40, source: "api" as const, ts: "2026-02-23T15:50:00Z" },
    { tests: ["T-005", "T-006", "T-011"], price: 285.20, source: "calculator" as const, ts: "2026-02-23T10:30:00Z" },
  ];

  for (const ld of logDefs) {
    const testNames = ld.tests.map(
      (tid) => testData.find((t) => t.testId === tid)?.name ?? tid
    );
    await prisma.pricingLog.create({
      data: {
        panelTestIds: ld.tests,
        panelTestNames: testNames,
        finalPrice: ld.price,
        source: ld.source,
        orgId: org1.id,
        timestamp: new Date(ld.ts),
      },
    });
  }

  // Re-enable RLS after seeding
  await enableRLS(pool);

  console.log("Seed complete: 3 orgs, 6 users, 20 tests, 4 panels, 6 log entries");

  await prisma.$disconnect();
  await pool.end();
}

main()
  .catch(async (e) => {
    // Best-effort re-enable RLS on failure
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await enableRLS(pool).catch(() => {});
    await pool.end();
    console.error(e);
    process.exit(1);
  });
