export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getApiOrg, apiResponse, apiError } from "@/lib/api";
import { getEstimate, markEstimateSent } from "@/lib/services/estimates";
import { sendEstimateEmail } from "@/lib/email";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { org, userId, error } = await getApiOrg();
  if (error) return error;

  const estimate = await getEstimate(org!.id, id);
  if (!estimate) return apiError("Estimate not found", 404);

  const recipientEmail = estimate.customer.email;
  if (!recipientEmail) return apiError("Customer has no email address");

  if (estimate.status === "approved" || estimate.status === "declined") {
    return apiError(`Cannot send a ${estimate.status} estimate`);
  }

  const token = estimate.approvalToken ?? crypto.randomUUID();

  try {
    await sendEstimateEmail({
      to: recipientEmail,
      customerName: estimate.customer.fullName,
      orgName: org!.name,
      estimateNumber: estimate.estimateNumber,
      title: estimate.title,
      total: Number(estimate.total),
      token,
      validUntil: estimate.validUntil,
    });
  } catch (e) {
    return apiError(e instanceof Error ? e.message : "Failed to send email");
  }

  await markEstimateSent(org!.id, userId!, id, token);
  const updated = await getEstimate(org!.id, id);
  return apiResponse(updated);
}