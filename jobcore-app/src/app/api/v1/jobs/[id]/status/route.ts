import { NextRequest } from "next/server";
import { getApiOrg, apiResponse, apiError } from "@/lib/api";
import { updateJobStatus } from "@/lib/services/jobs";
import type { JobStatus } from "@prisma/client";

const VALID_STATUSES: JobStatus[] = ["draft", "scheduled", "in_progress", "on_hold", "completed", "cancelled"];

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

  const status = body.status as JobStatus;
  if (!status || !VALID_STATUSES.includes(status)) {
    return apiError(`status must be one of: ${VALID_STATUSES.join(", ")}`);
  }

  try {
    const job = await updateJobStatus(org!.id, userId!, id, status);
    return apiResponse(job);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : "Failed to update job status");
  }
}
