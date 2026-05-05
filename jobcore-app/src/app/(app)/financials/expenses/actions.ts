"use server";

import { requireOrg } from "@/lib/auth";
import {
  createExpense,
  updateExpense,
  deleteExpense,
} from "@/lib/services/expenses";
import { softDeleteFile } from "@/lib/services/files";
import { deleteFromStorage } from "@/lib/storage";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createExpenseAction(formData: FormData) {
  const { user, org } = await requireOrg();

  const vendor = (formData.get("vendor") as string) || undefined;
  const amountStr = formData.get("amount") as string;
  const category = formData.get("category") as string;
  const dateStr = formData.get("date") as string;
  const description = (formData.get("description") as string) || undefined;
  const jobId = (formData.get("jobId") as string) || undefined;

  if (!amountStr || !category || !dateStr) {
    throw new Error("Amount, category, and date are required");
  }

  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount < 0) throw new Error("Invalid amount");

  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));

  const expense = await createExpense(org.id, user.id, {
    vendor,
    amount,
    category,
    date,
    description,
    jobId,
  });

  revalidatePath("/financials/expenses");
  redirect(`/financials/expenses/${expense.id}`);
}

export async function updateExpenseAction(formData: FormData) {
  const { user, org } = await requireOrg();

  const expenseId = formData.get("expenseId") as string;
  const vendor = (formData.get("vendor") as string) || undefined;
  const amountStr = formData.get("amount") as string;
  const category = formData.get("category") as string;
  const dateStr = formData.get("date") as string;
  const description = (formData.get("description") as string) || undefined;
  const jobId = (formData.get("jobId") as string) || undefined;

  if (!expenseId || !amountStr || !category || !dateStr) {
    throw new Error("Missing required fields");
  }

  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount < 0) throw new Error("Invalid amount");

  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));

  await updateExpense(org.id, user.id, expenseId, {
    vendor,
    amount,
    category,
    date,
    description,
    jobId,
  });

  revalidatePath("/financials/expenses");
  revalidatePath(`/financials/expenses/${expenseId}`);
  redirect(`/financials/expenses/${expenseId}`);
}

export async function deleteExpenseAction(formData: FormData) {
  const { org } = await requireOrg();
  const expenseId = formData.get("expenseId") as string;
  if (!expenseId) throw new Error("expenseId required");

  await deleteExpense(org.id, expenseId);
  revalidatePath("/financials/expenses");
  redirect("/financials/expenses");
}

export async function deleteReceiptAction(
  expenseId: string,
  fileId: string
): Promise<void> {
  const { user, org } = await requireOrg();

  const storageKey = await softDeleteFile(org.id, user.id, fileId);
  try {
    await deleteFromStorage(storageKey);
  } catch {
    console.error(`Failed to delete receipt storage object ${storageKey}`);
  }

  await updateExpense(org.id, user.id, expenseId, { receiptFileId: null });
  revalidatePath(`/financials/expenses/${expenseId}`);
}

export async function linkReceiptAction(
  expenseId: string,
  fileId: string
): Promise<void> {
  const { user, org } = await requireOrg();
  await updateExpense(org.id, user.id, expenseId, { receiptFileId: fileId });
  revalidatePath(`/financials/expenses/${expenseId}`);
}
