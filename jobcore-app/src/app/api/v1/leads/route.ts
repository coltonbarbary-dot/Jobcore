export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getApiOrg, apiResponse, apiError } from "@/lib/api";
import { listLeads, createLead } from "@/lib/services/leads";
import type { LeadStatus } from "@prisma/client";

function parsePagination(req: NextRequest): { limit: number; offset: number } {
  const limit = Math.min(Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") ?? "50")), 100);
  const offset = Math.max(0, parseInt(req.nextUrl.searchParams.get("offset") ?? "0"));
  return { limit, offset };
}

export async function GET(req: NextRequest) {
  const { org, error } = await getApiOrg();
  if (error) return error;
  const { limit, offset } = parsePagination(req);
  const leads = await listLeads(org!.id, { limit, offset });
  return apiResponse(leads);
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

  try {
    const lead = await createLead(org!.id, userId!, {
      title,
      customerId: (body.customerId as string) || undefined,
      description: (body.description as string)?.trim() || undefined,
      status: (body.status as LeadStatus) || "new",
      source: (body.source as string)?.trim() || undefined,
      budgetEstimate: body.budgetEstimate !== undefined ? Number(body.budgetEstimate) : undefined,
      notes: (body.notes as string)?.trim() || undefined,
    });
    return apiResponse(lead, 201);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : "Failed to create lead");
  }
}
