"use server";

import { requireOrg } from "@/lib/auth";
import {
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getInvoice,
  markInvoiceSent,
  voidInvoice,
  recordPayment,
  type InvoiceItemInput,
} from "@/lib/services/invoices";
import { sendInvoiceEmail } from "@/lib/email";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PaymentMethod } from "@prisma/client";

type ActionState = { error?: string };

function parseItems(formData: FormData): InvoiceItemInput[] {
  const raw = formData.get("items") as string;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Array<{ description: string; quantity: string; unitPrice: string }>;
    return parsed
      .filter((i) => i.description?.trim())
      .map((i) => ({
        description: i.description.trim(),
        quantity: Math.max(0, parseFloat(i.quantity) || 0),
        unitPrice: Math.max(0, parseFloat(i.unitPrice) || 0),
      }));
  } catch {
    return [];
  }
}

function parseTaxRate(formData: FormData): number {
  const raw = formData.get("taxRatePercent") as string;
  const pct = parseFloat(raw) || 0;
  return Math.max(0, Math.min(100, pct)) / 100;
}

function parseDiscount(formData: FormData): number {
  const raw = formData.get("discountAmount") as string;
  return Math.max(0, parseFloat(raw) || 0);
}

function parseDueDate(formData: FormData): { date: Date | undefined; error?: string } {
  const raw = (formData.get("dueDate") as string)?.trim();
  if (!raw) return { date: undefined };
  const d = new Date(raw);
  if (isNaN(d.getTime())) return { date: undefined, error: "Invalid due date" };
  return { date: d };
}

export async function createInvoiceAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { user, org } = await requireOrg();

  const customerId = formData.get("customerId") as string;
  if (!customerId) return { error: "Customer is required" };

  const dueDateResult = parseDueDate(formData);
  if (dueDateResult.error) return { error: dueDateResult.error };

  const jobId = (formData.get("jobId") as string)?.trim() || undefined;

  let invoiceId: string;
  try {
    const invoice = await createInvoice(org.id, user.id, {
      customerId,
      jobId,
      dueDate: dueDateResult.date,
      taxRate: parseTaxRate(formData),
      discountAmount: parseDiscount(formData),
      notes: (formData.get("notes") as string)?.trim() || undefined,
      terms: (formData.get("terms") as string)?.trim() || undefined,
      items: parseItems(formData),
    });
    invoiceId = invoice.id;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create invoice" };
  }

  revalidatePath("/operations/invoices");
  revalidatePath("/dashboard");
  redirect(`/operations/invoices/${invoiceId}`);
}

export async function updateInvoiceAction(
  invoiceId: string,
  _: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { user, org } = await requireOrg();

  const dueDateResult = parseDueDate(formData);
  if (dueDateResult.error) return { error: dueDateResult.error };

  const jobIdRaw = formData.get("jobId") as string;
  const jobId = jobIdRaw?.trim() || undefined;

  try {
    await updateInvoice(org.id, user.id, invoiceId, {
      customerId: (formData.get("customerId") as string) || undefined,
      jobId,
      dueDate: dueDateResult.date,
      taxRate: parseTaxRate(formData),
      discountAmount: parseDiscount(formData),
      notes: (formData.get("notes") as string)?.trim() || undefined,
      terms: (formData.get("terms") as string)?.trim() || undefined,
      items: parseItems(formData),
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update invoice" };
  }

  revalidatePath(`/operations/invoices/${invoiceId}`);
  revalidatePath("/operations/invoices");
  redirect(`/operations/invoices/${invoiceId}`);
}

export async function sendInvoiceAction(invoiceId: string): Promise<{ error?: string }> {
  const { user, org } = await requireOrg();

  const invoice = await getInvoice(org.id, invoiceId);
  if (!invoice) return { error: "Invoice not found" };

  const recipientEmail = invoice.customer.email;
  if (!recipientEmail) return { error: "Customer has no email address. Add one before sending." };

  if (invoice.status === "paid" || invoice.status === "void") {
    return { error: `Cannot send a ${invoice.status} invoice` };
  }

  const token = invoice.publicToken ?? crypto.randomUUID();

  try {
    await sendInvoiceEmail({
      to: recipientEmail,
      customerName: invoice.customer.fullName,
      orgName: org.name,
      invoiceNumber: invoice.invoiceNumber,
      amountDue: Number(invoice.amountDue),
      token,
      dueDate: invoice.dueDate,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to send email" };
  }

  await markInvoiceSent(org.id, user.id, invoiceId, token);

  revalidatePath(`/operations/invoices/${invoiceId}`);
  revalidatePath("/operations/invoices");
  return {};
}

export async function voidInvoiceAction(invoiceId: string): Promise<{ error?: string }> {
  const { user, org } = await requireOrg();

  try {
    await voidInvoice(org.id, user.id, invoiceId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to void invoice" };
  }

  revalidatePath(`/operations/invoices/${invoiceId}`);
  revalidatePath("/operations/invoices");
  revalidatePath("/dashboard");
  return {};
}

export async function recordPaymentAction(
  invoiceId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const { user, org } = await requireOrg();

  const amountRaw = parseFloat(formData.get("amount") as string);
  if (isNaN(amountRaw) || amountRaw <= 0) return { error: "Amount must be greater than zero" };

  const method = (formData.get("method") as PaymentMethod) || "other";
  const paidAtRaw = (formData.get("paidAt") as string)?.trim();
  const paidAt = paidAtRaw ? new Date(paidAtRaw) : new Date();
  const referenceNumber = (formData.get("referenceNumber") as string)?.trim() || undefined;

  try {
    await recordPayment(org.id, user.id, invoiceId, {
      amount: amountRaw,
      method,
      paidAt,
      referenceNumber,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to record payment" };
  }

  revalidatePath(`/operations/invoices/${invoiceId}`);
  revalidatePath("/operations/invoices");
  revalidatePath("/dashboard");
  return {};
}

export async function deleteInvoiceAction(invoiceId: string): Promise<{ error?: string }> {
  const { user, org } = await requireOrg();

  try {
    await deleteInvoice(org.id, user.id, invoiceId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete invoice" };
  }

  revalidatePath("/operations/invoices");
  revalidatePath("/dashboard");
  redirect("/operations/invoices");
}
