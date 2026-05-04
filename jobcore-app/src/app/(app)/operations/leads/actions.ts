"use server";

import { requireOrg } from "@/lib/auth";
import {
  createLead,
  updateLead,
  deleteLead,
  convertLead,
  type ConvertLeadData,
} from "@/lib/services/leads";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type ActionState = { error?: string };

export async function createLeadAction(
  _: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { user, org } = await requireOrg();

  const title = (formData.get("title") as string)?.trim();
  if (!title) return { error: "Title is required" };

  const budgetRaw = formData.get("budgetEstimate") as string;
  const budget = budgetRaw ? parseFloat(budgetRaw) : undefined;
  if (budgetRaw && isNaN(budget!)) return { error: "Budget must be a valid number" };

  let leadId: string;
  try {
    const lead = await createLead(org.id, user.id, {
      title,
      status: (formData.get("status") as string) as Parameters<typeof createLead>[2]["status"],
      source: (formData.get("source") as string)?.trim() || undefined,
      customerId: (formData.get("customerId") as string) || undefined,
      description: (formData.get("description") as string)?.trim() || undefined,
      budgetEstimate: budget,
      notes: (formData.get("notes") as string)?.trim() || undefined,
    });
    leadId = lead.id;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create lead" };
  }

  revalidatePath("/operations/leads");
  revalidatePath("/dashboard");
  redirect(`/operations/leads/${leadId}`);
}

export async function updateLeadAction(
  leadId: string,
  _: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { user, org } = await requireOrg();

  const title = (formData.get("title") as string)?.trim();
  if (!title) return { error: "Title is required" };

  const budgetRaw = formData.get("budgetEstimate") as string;
  const budget = budgetRaw ? parseFloat(budgetRaw) : undefined;
  if (budgetRaw && isNaN(budget!)) return { error: "Budget must be a valid number" };

  try {
    await updateLead(org.id, user.id, leadId, {
      title,
      status: (formData.get("status") as string) as Parameters<typeof updateLead>[3]["status"],
      source: (formData.get("source") as string)?.trim() || undefined,
      customerId: (formData.get("customerId") as string) || undefined,
      description: (formData.get("description") as string)?.trim() || undefined,
      budgetEstimate: budget,
      notes: (formData.get("notes") as string)?.trim() || undefined,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update lead" };
  }

  revalidatePath(`/operations/leads/${leadId}`);
  revalidatePath("/operations/leads");
  redirect(`/operations/leads/${leadId}`);
}

export async function deleteLeadAction(leadId: string): Promise<{ error?: string }> {
  const { user, org } = await requireOrg();

  try {
    await deleteLead(org.id, user.id, leadId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete lead" };
  }

  revalidatePath("/operations/leads");
  revalidatePath("/dashboard");
  redirect("/operations/leads");
}

export async function convertLeadAction(
  leadId: string,
  data: ConvertLeadData
): Promise<{ error?: string; customerId?: string; jobId?: string }> {
  const { user, org } = await requireOrg();

  try {
    const result = await convertLead(org.id, user.id, leadId, data);
    revalidatePath("/operations/leads");
    revalidatePath("/operations/customers");
    revalidatePath("/operations/jobs");
    revalidatePath("/dashboard");
    return { customerId: result.customer.id, jobId: result.job?.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to convert lead" };
  }
}
