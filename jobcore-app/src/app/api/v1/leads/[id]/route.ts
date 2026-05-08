export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getApiOrg, apiResponse, apiError } from "@/lib/api";
import { getLead, updateLead, deleteLead } from "@/lib/services/leads";
import type { LeadStatus } from "@prisma/client";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { org, error } = await getApiOrg();
  if (error) return error;
  const lead = await getLead(org!.id, id);
  if (!lead) return apiError("Lead not found", 404);
  return apiResponse(lead);
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
    const lead = await updateLead(org!.id, userId!, id, {
      title: (body.title as string)?.trim() || undefined,
      customerId: body.customerId !== undefined ? ((body.customerId as string) || undefined) : undefined,
      description: body.description !== undefined ? ((body.description as string)?.trim() || undefined) : undefined,
      status: body.status !== undefined ? (body.status as LeadStatus) : undefined,
      source: body.source !== undefined ? ((body.source as string)?.trim() || undefined) : undefined,
      budgetEstimate: body.budgetEstimate !== undefined ? Number(body.budgetEstimate) : undefined,
      notes: body.notes !== undefined ? ((body.notes as string)?.trim() || undefined) : undefined,
    });
    return apiResponse(lead);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : "Failed to update lead");
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { org, userId, error } = await getApiOrg();
  if (error) return error;

  try {
    await deleteLead(org!.id, userId!, id);
    return apiResponse({ deleted: true });
  } catch (e) {
    return apiError(e instanceof Error ? e.message : "Failed to delete lead");
  }
}