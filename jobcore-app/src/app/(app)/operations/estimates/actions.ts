"use server";

import { requireOrg } from "@/lib/auth";
import {
  createEstimate,
  updateEstimate,
  deleteEstimate,
  getEstimate,
  markEstimateSent,
  type EstimateItemInput,
} from "@/lib/services/estimates";
import { sendEstimateEmail } from "@/lib/email";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type ActionState = { error?: string };

function parseItems(formData: FormData): EstimateItemInput[] {
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
  return Math.max(0, Math.min(100, pct)) / 100; // store as decimal fraction
}

function parseValidUntil(formData: FormData): { date: Date | undefined; error?: string } {
  const raw = (formData.get("validUntil") as string)?.trim();
  if (!raw) return { date: undefined };
  const d = new Date(raw);
  if (isNaN(d.getTime())) return { date: undefined, error: "Invalid valid-until date" };
  return { date: d };
}

export async function createEstimateAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { user, org } = await requireOrg();

  const title = (formData.get("title") as string)?.trim();
  if (!title) return { error: "Title is required" };

  const customerId = formData.get("customerId") as string;
  if (!customerId) return { error: "Customer is required" };

  const validUntilResult = parseValidUntil(formData);
  if (validUntilResult.error) return { error: validUntilResult.error };

  let estimateId: string;
  try {
    const estimate = await createEstimate(org.id, user.id, {
      title,
      customerId,
      validUntil: validUntilResult.date,
      taxRate: parseTaxRate(formData),
      notes: (formData.get("notes") as string)?.trim() || undefined,
      terms: (formData.get("terms") as string)?.trim() || undefined,
      items: parseItems(formData),
    });
    estimateId = estimate.id;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create estimate" };
  }

  revalidatePath("/operations/estimates");
  revalidatePath("/dashboard");
  redirect(`/operations/estimates/${estimateId}`);
}

export async function updateEstimateAction(
  estimateId: string,
  _: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { user, org } = await requireOrg();

  const title = (formData.get("title") as string)?.trim();
  if (!title) return { error: "Title is required" };

  const validUntilResult = parseValidUntil(formData);
  if (validUntilResult.error) return { error: validUntilResult.error };

  try {
    await updateEstimate(org.id, user.id, estimateId, {
      title,
      customerId: (formData.get("customerId") as string) || undefined,
      validUntil: validUntilResult.date,
      taxRate: parseTaxRate(formData),
      notes: (formData.get("notes") as string)?.trim() || undefined,
      terms: (formData.get("terms") as string)?.trim() || undefined,
      items: parseItems(formData),
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update estimate" };
  }

  revalidatePath(`/operations/estimates/${estimateId}`);
  revalidatePath("/operations/estimates");
  redirect(`/operations/estimates/${estimateId}`);
}

export async function sendEstimateAction(estimateId: string): Promise<{ error?: string }> {
  const { user, org } = await requireOrg();

  const estimate = await getEstimate(org.id, estimateId);
  if (!estimate) return { error: "Estimate not found" };

  const recipientEmail = estimate.customer.email;
  if (!recipientEmail) return { error: "Customer has no email address. Add one before sending." };

  if (estimate.status === "approved" || estimate.status === "declined") {
    return { error: `Cannot send a ${estimate.status} estimate` };
  }

  // Reuse existing token so the public link is stable across resends
  const token = estimate.approvalToken ?? crypto.randomUUID();

  try {
    await sendEstimateEmail({
      to: recipientEmail,
      customerName: estimate.customer.fullName,
      orgName: org.name,
      estimateNumber: estimate.estimateNumber,
      title: estimate.title,
      total: Number(estimate.total),
      token,
      validUntil: estimate.validUntil,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to send email" };
  }

  // Status update only happens AFTER email succeeds
  await markEstimateSent(org.id, user.id, estimateId, token);

  revalidatePath(`/operations/estimates/${estimateId}`);
  revalidatePath("/operations/estimates");
  return {};
}

export async function deleteEstimateAction(estimateId: string): Promise<{ error?: string }> {
  const { user, org } = await requireOrg();

  try {
    await deleteEstimate(org.id, user.id, estimateId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete estimate" };
  }

  revalidatePath("/operations/estimates");
  revalidatePath("/dashboard");
  redirect("/operations/estimates");
}
