export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getApiOrg, apiResponse, apiError } from "@/lib/api";
import { getEstimate, updateEstimate, deleteEstimate } from "@/lib/services/estimates";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { org, error } = await getApiOrg();
  if (error) return error;
  const estimate = await getEstimate(org!.id, id);
  if (!estimate) return apiError("Estimate not found", 404);
  return apiResponse(estimate);
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

  const taxRatePct = body.taxRatePercent !== undefined ? Number(body.taxRatePercent) : undefined;
  if (taxRatePct !== undefined && (isNaN(taxRatePct) || taxRatePct < 0 || taxRatePct > 100)) {
    return apiError("taxRatePercent must be between 0 and 100");
  }

  try {
    const estimate = await updateEstimate(org!.id, userId!, id, {
      title: (body.title as string)?.trim() || undefined,
      customerId: body.customerId !== undefined ? ((body.customerId as string) || undefined) : undefined,
      validUntil: body.validUntil !== undefined ? (body.validUntil ? new Date(body.validUntil as string) : undefined) : undefined,
      taxRate: taxRatePct !== undefined ? taxRatePct / 100 : undefined,
      notes: body.notes !== undefined ? ((body.notes as string)?.trim() || undefined) : undefined,
      terms: body.terms !== undefined ? ((body.terms as string)?.trim() || undefined) : undefined,
    });
    return apiResponse(estimate);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : "Failed to update estimate");
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { org, userId, error } = await getApiOrg();
  if (error) return error;

  try {
    await deleteEstimate(org!.id, userId!, id);
    return apiResponse({ deleted: true });
  } catch (e) {
    return apiError(e instanceof Error ? e.message : "Failed to delete estimate");
  }
}