"use server";

import { approveEstimate, declineEstimate } from "@/lib/services/estimates";

export async function approveEstimateAction(
  token: string
): Promise<{ jobId?: string; alreadyApproved?: boolean; error?: string }> {
  try {
    const result = await approveEstimate(token);
    return { jobId: result.jobId, alreadyApproved: result.alreadyApproved };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to approve estimate" };
  }
}

export async function declineEstimateAction(token: string): Promise<{ error?: string }> {
  try {
    await declineEstimate(token);
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to decline estimate" };
  }
}
