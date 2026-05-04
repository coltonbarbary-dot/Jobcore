import { NextRequest } from "next/server";
import { getApiOrg, apiResponse, apiError } from "@/lib/api";
import { getJob, updateJob, deleteJob } from "@/lib/services/jobs";
import type { JobStatus, JobPriority } from "@prisma/client";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { org, error } = await getApiOrg();
  if (error) return error;
  const job = await getJob(org!.id, id);
  if (!job) return apiError("Job not found", 404);
  return apiResponse(job);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { org, userId, error } = await getApiOrg();
  if (error) return error;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body");
  }

  try {
    const job = await updateJob(org!.id, userId!, id, {
      title: (body.title as string)?.trim() || undefined,
      description: body.description !== undefined ? ((body.description as string)?.trim() || undefined) : undefined,
      status: body.status !== undefined ? (body.status as JobStatus) : undefined,
      priority: body.priority !== undefined ? (body.priority as JobPriority) : undefined,
      jobType: body.jobType !== undefined ? ((body.jobType as string)?.trim() || undefined) : undefined,
      scheduledStart: body.scheduledStart !== undefined ? (body.scheduledStart ? new Date(body.scheduledStart as string) : undefined) : undefined,
      scheduledEnd: body.scheduledEnd !== undefined ? (body.scheduledEnd ? new Date(body.scheduledEnd as string) : undefined) : undefined,
      notes: body.notes !== undefined ? ((body.notes as string)?.trim() || undefined) : undefined,
    });
    return apiResponse(job);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : "Failed to update job");
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { org, userId, error } = await getApiOrg();
  if (error) return error;

  try {
    await deleteJob(org!.id, userId!, id);
    return apiResponse({ deleted: true });
  } catch (e) {
    return apiError(e instanceof Error ? e.message : "Failed to delete job");
  }
}
