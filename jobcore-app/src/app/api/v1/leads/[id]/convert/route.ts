export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getApiOrg, apiResponse, apiError } from "@/lib/api";
import { convertLead } from "@/lib/services/leads";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { org, userId, error } = await getApiOrg();
  if (error) return error;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body");
  }

  const createCustomer = body.createCustomer !== false;
  const existingCustomerId = body.existingCustomerId as string | undefined;

  if (createCustomer && !existingCustomerId) {
    const customerFullName = (body.customerFullName as string)?.trim();
    if (!customerFullName) return apiError("customerFullName is required when creating a customer");
  }

  try {
    const result = await convertLead(org!.id, userId!, id, {
      createCustomer: !existingCustomerId,
      customerFullName: (body.customerFullName as string)?.trim(),
      customerEmail: (body.customerEmail as string)?.trim(),
      customerPhone: (body.customerPhone as string)?.trim(),
      existingCustomerId,
      createJob: !!body.createJob,
      jobTitle: (body.jobTitle as string)?.trim(),
      jobScheduledStart: body.jobScheduledStart ? new Date(body.jobScheduledStart as string) : undefined,
      jobScheduledEnd: body.jobScheduledEnd ? new Date(body.jobScheduledEnd as string) : undefined,
    });
    return apiResponse(result, 201);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : "Failed to convert lead");
  }
}