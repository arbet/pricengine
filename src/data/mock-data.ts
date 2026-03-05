export type Role = "super_admin" | "lab_manager" | "lab_employee";

export interface Organization {
  id: string;
  name: string;
  code: string;
  contactEmail: string;
  phone: string;
  address: string;
  createdAt: string;
  testsCount: number;
  usersCount: number;
}

export interface LabTest {
  id: string;
  name: string;
  reagentCost: number;
  listPrice: number;
  category: string;
  orgId: string;
}

export interface Panel {
  id: string;
  name: string;
  testIds: string[];
  orgId: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  panelTests: string[];
  finalPrice: number;
  source: "calculator" | "api";
  orgId: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: Role;
  orgId: string | null;
}

export const organizations: Organization[] = [
  {
    id: "org-1",
    name: "LabCorp East",
    code: "LCE",
    contactEmail: "admin@labcorpeast.com",
    phone: "(555) 234-5678",
    address: "1200 Medical Center Dr, Raleigh, NC 27610",
    createdAt: "2025-09-15",
    testsCount: 20,
    usersCount: 8,
  },
  {
    id: "org-2",
    name: "Metro Diagnostics",
    code: "MTD",
    contactEmail: "ops@metrodiag.com",
    phone: "(555) 876-5432",
    address: "450 Lab Parkway, Chicago, IL 60601",
    createdAt: "2025-11-02",
    testsCount: 15,
    usersCount: 5,
  },
  {
    id: "org-3",
    name: "Pacific Labs",
    code: "PCL",
    contactEmail: "info@pacificlabs.com",
    phone: "(555) 321-9876",
    address: "789 Coastal Blvd, San Diego, CA 92101",
    createdAt: "2026-01-10",
    testsCount: 18,
    usersCount: 6,
  },
];

export const labTests: LabTest[] = [
  { id: "T-001", name: "Complete Blood Count (CBC)", reagentCost: 4.5, listPrice: 45.0, category: "Hematology", orgId: "org-1" },
  { id: "T-002", name: "Basic Metabolic Panel (BMP)", reagentCost: 6.2, listPrice: 65.0, category: "Chemistry", orgId: "org-1" },
  { id: "T-003", name: "Comprehensive Metabolic Panel (CMP)", reagentCost: 8.75, listPrice: 95.0, category: "Chemistry", orgId: "org-1" },
  { id: "T-004", name: "Lipid Panel", reagentCost: 5.3, listPrice: 55.0, category: "Chemistry", orgId: "org-1" },
  { id: "T-005", name: "Thyroid Stimulating Hormone (TSH)", reagentCost: 12.4, listPrice: 120.0, category: "Endocrinology", orgId: "org-1" },
  { id: "T-006", name: "Hemoglobin A1c", reagentCost: 8.9, listPrice: 85.0, category: "Endocrinology", orgId: "org-1" },
  { id: "T-007", name: "Urinalysis", reagentCost: 2.1, listPrice: 25.0, category: "Urinalysis", orgId: "org-1" },
  { id: "T-008", name: "Prothrombin Time (PT/INR)", reagentCost: 6.8, listPrice: 70.0, category: "Coagulation", orgId: "org-1" },
  { id: "T-009", name: "CBC with Differential", reagentCost: 7.5, listPrice: 75.0, category: "Hematology", orgId: "org-1" },
  { id: "T-010", name: "Liver Function Panel (LFP)", reagentCost: 9.2, listPrice: 105.0, category: "Chemistry", orgId: "org-1" },
  { id: "T-011", name: "Vitamin D, 25-Hydroxy", reagentCost: 18.5, listPrice: 180.0, category: "Immunoassay", orgId: "org-1" },
  { id: "T-012", name: "Iron Studies Panel", reagentCost: 11.3, listPrice: 110.0, category: "Chemistry", orgId: "org-1" },
  { id: "T-013", name: "C-Reactive Protein (CRP)", reagentCost: 7.4, listPrice: 72.0, category: "Immunoassay", orgId: "org-1" },
  { id: "T-014", name: "Erythrocyte Sedimentation Rate (ESR)", reagentCost: 3.2, listPrice: 30.0, category: "Hematology", orgId: "org-1" },
  { id: "T-015", name: "Blood Glucose (Fasting)", reagentCost: 2.8, listPrice: 28.0, category: "Chemistry", orgId: "org-1" },
  { id: "T-016", name: "Troponin I", reagentCost: 22.5, listPrice: 220.0, category: "Cardiac", orgId: "org-1" },
  { id: "T-017", name: "B-Type Natriuretic Peptide (BNP)", reagentCost: 25.0, listPrice: 245.0, category: "Cardiac", orgId: "org-1" },
  { id: "T-018", name: "Ferritin", reagentCost: 9.8, listPrice: 95.0, category: "Immunoassay", orgId: "org-1" },
  { id: "T-019", name: "Phosphorus", reagentCost: 3.5, listPrice: 35.0, category: "Chemistry", orgId: "org-1" },
  { id: "T-020", name: "Magnesium", reagentCost: 4.1, listPrice: 40.0, category: "Chemistry", orgId: "org-1" },
];

export const panels: Panel[] = [
  { id: "P-001", name: "Basic Panel", testIds: ["T-001", "T-002", "T-004"], orgId: "org-1" },
  { id: "P-002", name: "Cardiac Panel", testIds: ["T-016", "T-017"], orgId: "org-1" },
  { id: "P-003", name: "Metabolic + Thyroid", testIds: ["T-003", "T-005", "T-006"], orgId: "org-1" },
  { id: "P-004", name: "Comprehensive", testIds: ["T-003", "T-010", "T-012", "T-005"], orgId: "org-1" },
  { id: "P-005", name: "Wellness Panel", testIds: ["T-001", "T-004", "T-007", "T-015"], orgId: "org-2" },
  { id: "P-006", name: "Diabetes Screen", testIds: ["T-006", "T-015", "T-019"], orgId: "org-2" },
  { id: "P-007", name: "Anemia Panel", testIds: ["T-001", "T-009", "T-012", "T-018"], orgId: "org-3" },
  { id: "P-008", name: "Thyroid + Metabolic", testIds: ["T-005", "T-003", "T-006"], orgId: "org-3" },
];

export const logEntries: LogEntry[] = [
  { id: "log-01", timestamp: "2026-02-25T14:32:00Z", panelTests: ["T-001", "T-002", "T-004"], finalPrice: 112.85, source: "calculator", orgId: "org-1" },
  { id: "log-02", timestamp: "2026-02-25T11:15:00Z", panelTests: ["T-016", "T-017"], finalPrice: 378.50, source: "api", orgId: "org-1" },
  { id: "log-03", timestamp: "2026-02-24T16:45:00Z", panelTests: ["T-003", "T-005", "T-006"], finalPrice: 218.30, source: "calculator", orgId: "org-1" },
  { id: "log-04", timestamp: "2026-02-24T09:20:00Z", panelTests: ["T-001"], finalPrice: 45.00, source: "calculator", orgId: "org-1" },
  { id: "log-05", timestamp: "2026-02-23T15:50:00Z", panelTests: ["T-010", "T-012", "T-018"], finalPrice: 225.40, source: "api", orgId: "org-1" },
  { id: "log-06", timestamp: "2026-02-23T10:30:00Z", panelTests: ["T-005", "T-006", "T-011"], finalPrice: 285.20, source: "calculator", orgId: "org-1" },
  { id: "log-07", timestamp: "2026-02-22T13:10:00Z", panelTests: ["T-001", "T-002"], finalPrice: 87.50, source: "calculator", orgId: "org-1" },
  { id: "log-08", timestamp: "2026-02-21T17:25:00Z", panelTests: ["T-007", "T-014", "T-015"], finalPrice: 62.30, source: "api", orgId: "org-1" },
  { id: "log-09", timestamp: "2026-02-20T08:45:00Z", panelTests: ["T-003", "T-010", "T-012", "T-005"], finalPrice: 312.75, source: "calculator", orgId: "org-1" },
  { id: "log-10", timestamp: "2026-02-19T14:00:00Z", panelTests: ["T-016"], finalPrice: 220.00, source: "calculator", orgId: "org-1" },
  { id: "log-11", timestamp: "2026-02-18T11:30:00Z", panelTests: ["T-001", "T-002", "T-004", "T-006"], finalPrice: 168.90, source: "api", orgId: "org-1" },
  { id: "log-12", timestamp: "2026-02-17T09:15:00Z", panelTests: ["T-009", "T-013", "T-008"], finalPrice: 152.60, source: "calculator", orgId: "org-1" },
];

export const mockUsers: User[] = [
  { id: "u-1", name: "Sarah Chen", email: "sarah@pricengine.com", role: "super_admin", orgId: null },
  { id: "u-2", name: "Dr. James Rivera", email: "jrivera@labcorpeast.com", role: "lab_manager", orgId: "org-1" },
  { id: "u-3", name: "Lab Staff", email: "staff@labcorpeast.com", role: "lab_employee", orgId: "org-1" },
  { id: "u-4", name: "Dr. Aisha Patel", email: "apatel@metrodiag.com", role: "lab_manager", orgId: "org-2" },
  { id: "u-5", name: "Lab Staff", email: "staff@metrodiag.com", role: "lab_employee", orgId: "org-2" },
  { id: "u-6", name: "Dr. Michael Tanaka", email: "mtanaka@pacificlabs.com", role: "lab_manager", orgId: "org-3" },
];

export function getTestsByOrg(orgId: string): LabTest[] {
  return labTests.filter((t) => t.orgId === orgId);
}

export function getTestById(testId: string): LabTest | undefined {
  return labTests.find((t) => t.id === testId);
}

export function getLogsByOrg(orgId: string): LogEntry[] {
  return logEntries.filter((l) => l.orgId === orgId);
}

export function getOrgById(orgId: string): Organization | undefined {
  return organizations.find((o) => o.id === orgId);
}

export function getPanelsByOrg(orgId: string): Panel[] {
  return panels.filter((p) => p.orgId === orgId);
}

export function getRoleName(role: Role): string {
  switch (role) {
    case "super_admin": return "Super Admin";
    case "lab_manager": return "Lab Manager";
    case "lab_employee": return "Lab Employee";
  }
}
