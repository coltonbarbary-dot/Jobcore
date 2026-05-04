"use server";

import { requireOrg } from "@/lib/auth";
import {
  createJob,
  updateJob,
  updateJobStatus,
  deleteJob,
  type JobItemInput,
} from "@/lib/services/jobs";
import { type JobStatus, type JobPriority } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type ActionState = { error?: string };

function parseScheduledDate(
  raw: string,
  fieldLabel: string
): { date: Date | null; error?: string } {
  if (!raw) return { date: null };
  const d = new Date(raw);
  if (isNaN(d.getTime())) return { date: null, error: `Invalid ${fieldLabel} date` };
  return { date: d };
}

function parseItems(formData: FormData): JobItemInput[] {
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

export async function createJobAction(
  _: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { user, org } = await requireOrg();

  const title = (formData.get("title") as string)?.trim();
  if (!title) return { error: "Title is required" };

  const customerId = formData.get("customerId") as string;
  if (!customerId) return { error: "Customer is required" };

  const scheduledStartRaw = formData.get("scheduledStart") as string;
  const scheduledEndRaw = formData.get("scheduledEnd") as string;

  const start = parseScheduledDate(scheduledStartRaw, "scheduled start");
  if (start.error) return { error: start.error };
  const end = parseScheduledDate(scheduledEndRaw, "scheduled end");
  if (end.error) return { error: end.error };

  let jobId: string;
  try {
    const job = await createJob(org.id, user.id, {
      title,
      customerId,
      description: (formData.get("description") as string)?.trim() || undefined,
      status: (formData.get("status") as JobStatus) || "draft",
      priority: (formData.get("priority") as JobPriority) || "normal",
      jobType: (formData.get("jobType") as string)?.trim() || undefined,
      scheduledStart: start.date ?? undefined,
      scheduledEnd: end.date ?? undefined,
      notes: (formData.get("notes") as string)?.trim() || undefined,
      items: parseItems(formData),
    });
    jobId = job.id;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create job" };
  }

  revalidatePath("/operations/jobs");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  redirect(`/operations/jobs/${jobId}`);
}

export async function updateJobAction(
  jobId: string,
  _: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { user, org } = await requireOrg();

  const title = (formData.get("title") as string)?.trim();
  if (!title) return { error: "Title is required" };

  const scheduledStartRaw = formData.get("scheduledStart") as string;
  const scheduledEndRaw = formData.get("scheduledEnd") as string;

  const start = parseScheduledDate(scheduledStartRaw, "scheduled start");
  if (start.error) return { error: start.error };
  const end = parseScheduledDate(scheduledEndRaw, "scheduled end");
  if (end.error) return { error: end.error };

  try {
    await updateJob(org.id, user.id, jobId, {
      title,
      description: (formData.get("description") as string)?.trim() || undefined,
      status: (formData.get("status") as JobStatus) || undefined,
      priority: (formData.get("priority") as JobPriority) || undefined,
      jobType: (formData.get("jobType") as string)?.trim() || undefined,
      scheduledStart: start.date,
      scheduledEnd: end.date,
      notes: (formData.get("notes") as string)?.trim() || undefined,
      items: parseItems(formData),
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update job" };
  }

  revalidatePath(`/operations/jobs/${jobId}`);
  revalidatePath("/operations/jobs");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  redirect(`/operations/jobs/${jobId}`);
}

export async function updateJobStatusAction(
  jobId: string,
  status: JobStatus
): Promise<{ error?: string }> {
  const { user, org } = await requireOrg();

  try {
    await updateJobStatus(org.id, user.id, jobId, status);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update status" };
  }

  revalidatePath(`/operations/jobs/${jobId}`);
  revalidatePath("/operations/jobs");
  revalidatePath("/dashboard");
  return {};
}

export async function deleteJobAction(jobId: string): Promise<{ error?: string }> {
  const { user, org } = await requireOrg();

  try {
    await deleteJob(org.id, user.id, jobId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete job" };
  }

  revalidatePath("/operations/jobs");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  redirect("/operations/jobs");
}
