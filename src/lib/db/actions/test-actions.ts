"use server";

import { prisma } from "@/lib/db/client";
import { auth } from "@/lib/auth/config";
import { createTestSchema, updateTestSchema, excelTestRowSchema } from "@/lib/validations/schemas";
import { revalidatePath } from "next/cache";
import ExcelJS from "exceljs";
import { formatError } from "./utils";

async function getSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as { id: string; role: string; orgId: string | null };
  if (user.role !== "lab_manager") throw new Error("Forbidden");
  if (!user.orgId) throw new Error("No organization");
  return user;
}

export async function createTest(data: {
  testId: string;
  name: string;
  reagentCost: number;
  listPrice: number;
  category?: string;
}) {
  try {
    const user = await getSession();
    const parsed = createTestSchema.parse(data);

    const test = await prisma.labTest.create({
      data: {
        testId: parsed.testId,
        name: parsed.name,
        reagentCost: parsed.reagentCost,
        listPrice: parsed.listPrice,
        category: parsed.category || null,
        orgId: user.orgId!,
      },
    });

    revalidatePath("/dashboard/tests");
    return { success: true as const, test: { ...test, reagentCost: Number(test.reagentCost), listPrice: Number(test.listPrice) } };
  } catch (e) {
    return { success: false as const, error: formatError(e) };
  }
}

export async function updateTest(data: {
  id: string;
  testId: string;
  name: string;
  reagentCost: number;
  listPrice: number;
  category?: string;
}) {
  try {
    const user = await getSession();
    const parsed = updateTestSchema.parse(data);

    const existing = await prisma.labTest.findUnique({ where: { id: parsed.id } });
    if (!existing || existing.orgId !== user.orgId) throw new Error("Not found");

    const test = await prisma.labTest.update({
      where: { id: parsed.id },
      data: {
        testId: parsed.testId,
        name: parsed.name,
        reagentCost: parsed.reagentCost,
        listPrice: parsed.listPrice,
        category: parsed.category || null,
      },
    });

    revalidatePath("/dashboard/tests");
    return { success: true as const, test: { ...test, reagentCost: Number(test.reagentCost), listPrice: Number(test.listPrice) } };
  } catch (e) {
    return { success: false as const, error: formatError(e) };
  }
}

export async function deleteTest(id: string) {
  try {
    const user = await getSession();

    const existing = await prisma.labTest.findUnique({ where: { id } });
    if (!existing || existing.orgId !== user.orgId) throw new Error("Not found");

    await prisma.labTest.delete({ where: { id } });

    revalidatePath("/dashboard/tests");
    return { success: true as const };
  } catch (e) {
    return { success: false as const, error: formatError(e) };
  }
}

export async function uploadTestCatalog(formData: FormData) {
  try {
    const user = await getSession();
    const file = formData.get("file") as File;
    if (!file) return { success: false as const, errors: [{ row: 0, message: "No file provided" }] };

    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(arrayBuffer as any);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) return { success: false as const, errors: [{ row: 0, message: "No worksheet found" }] };

    const errors: { row: number; message: string }[] = [];
    const rows: { testId: string; name: string; reagentCost: number; listPrice: number; category: string }[] = [];
    const seenTestIds = new Set<string>();

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const rawTestId = row.getCell(1).text?.trim();
      const rawName = row.getCell(2).text?.trim();
      const rawReagent = parseFloat(String(row.getCell(3).value));
      const rawList = parseFloat(String(row.getCell(4).value));
      const rawCategory = row.getCell(5).text?.trim() || "";

      const result = excelTestRowSchema.safeParse({
        testId: rawTestId,
        name: rawName,
        reagentCost: isNaN(rawReagent) ? -1 : rawReagent,
        listPrice: isNaN(rawList) ? -1 : rawList,
        category: rawCategory,
      });

      if (!result.success) {
        const issues = result.error.issues.map((i) => i.message).join("; ");
        errors.push({ row: rowNumber, message: issues });
        return;
      }

      if (seenTestIds.has(result.data.testId)) {
        errors.push({ row: rowNumber, message: `Duplicate Test ID: ${result.data.testId}` });
        return;
      }

      seenTestIds.add(result.data.testId);
      rows.push(result.data);
    });

    if (errors.length > 0) {
      return { success: false as const, errors, validCount: rows.length };
    }

    if (rows.length === 0) {
      return { success: false as const, errors: [{ row: 0, message: "No valid test rows found" }] };
    }

    // Bulk upsert
    for (const row of rows) {
      await prisma.labTest.upsert({
        where: { testId_orgId: { testId: row.testId, orgId: user.orgId! } },
        update: {
          name: row.name,
          reagentCost: row.reagentCost,
          listPrice: row.listPrice,
          category: row.category || null,
        },
        create: {
          testId: row.testId,
          name: row.name,
          reagentCost: row.reagentCost,
          listPrice: row.listPrice,
          category: row.category || null,
          orgId: user.orgId!,
        },
      });
    }

    revalidatePath("/dashboard/tests");
    return { success: true as const, importedCount: rows.length };
  } catch (e) {
    return { success: false as const, error: formatError(e) };
  }
}
