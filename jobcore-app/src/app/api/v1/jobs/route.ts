export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getApiOrg, apiResponse, apiError } from "@/lib/api";
import { listJobs, createJob } from "@/lib/services/jobs";
import type { JobStatus, JobPriority } from "@prisma/client";

function parsePagination(req: NextRequest): { limit: number; offset: number } {
  const limit = Math.min(Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") ?? "50")), 100);
  const offset = Math.max(0, parseInt(req.nextUrl.searchParams.get("offset") ?? "0"));
  return { limit, offset };
}

export async function GET(req: NextRequest) {
  const { org, error } = await getApiOrg();
  if (error) return error;
  const { limit, offset } = parsePagination(req);
  const jobs = await listJobs(org!.id, { limit, offset });
  return apiResponse(jobs);
}

export async function POST(req: NextRequest) {
  const { org, userId, error } = await getApiOrg();
  if (error) return error;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body");
  }

  const title = (body.title as string)?.trim();
  if (!title) return apiError("title is required");

  const customerId = body.customerId as string;
  if (!customerId) return apiError("customerId is required");

  try {
    const job = await createJob(org!.id, userId!, {
      title,
      customerId,
      description: (body.description as string)?.trim() || undefined,
      status: (body.status as JobStatus) || "draft",
      priority: (body.priority as JobPriority) || "normal",
      jobType: (body.jobType as string)?.trim() || undefined,
      scheduledStart: body.scheduledStart ? new Date(body.scheduledStart as string) : undefined,
      scheduledEnd: body.scheduledEnd ? new Date(body.scheduledEnd as string) : undefined,
      notes: (body.notes as string)?.trim() || undefined,
    });
    return apiResponse(job, 201);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : "Failed to create job");
  }
}