import { NextRequest } from "next/server";
import { getApiOrg, apiResponse, apiError } from "@/lib/api";
import { listEstimates, createEstimate } from "@/lib/services/estimates";

function parsePagination(req: NextRequest): { limit: number; offset: number } {
  const limit = Math.min(Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") ?? "50")), 100);
  const offset = Math.max(0, parseInt(req.nextUrl.searchParams.get("offset") ?? "0"));
  return { limit, offset };
}

export async function GET(req: NextRequest) {
  const { org, error } = await getApiOrg();
  if (error) return error;
  const { limit, offset } = parsePagination(req);
  const estimates = await listEstimates(org!.id, { limit, offset });
  return apiResponse(estimates);
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

  const taxRatePct = body.taxRatePercent !== undefined ? Number(body.taxRatePercent) : 0;
  if (isNaN(taxRatePct) || taxRatePct < 0 || taxRatePct > 100) {
    return apiError("taxRatePercent must be between 0 and 100");
  }

  try {
    const estimate = await createEstimate(org!.id, userId!, {
      title,
      customerId,
      validUntil: body.validUntil ? new Date(body.validUntil as string) : undefined,
      taxRate: taxRatePct / 100,
      notes: (body.notes as string)?.trim() || undefined,
      terms: (body.terms as string)?.trim() || undefined,
    });
    return apiResponse(estimate, 201);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : "Failed to create estimate");
  }
}
