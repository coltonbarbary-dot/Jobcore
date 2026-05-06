export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getApiOrg, apiResponse, apiError } from "@/lib/api";
import { listCustomers, createCustomer } from "@/lib/services/customers";

function parsePagination(req: NextRequest): { limit: number; offset: number } {
  const limit = Math.min(Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") ?? "50")), 100);
  const offset = Math.max(0, parseInt(req.nextUrl.searchParams.get("offset") ?? "0"));
  return { limit, offset };
}

export async function GET(req: NextRequest) {
  const { org, error } = await getApiOrg();
  if (error) return error;
  const { limit, offset } = parsePagination(req);
  const customers = await listCustomers(org!.id, { limit, offset });
  return apiResponse(customers);
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

  const fullName = (body.fullName as string)?.trim();
  if (!fullName) return apiError("fullName is required");

  try {
    const customer = await createCustomer(org!.id, userId!, {
      fullName,
      email: (body.email as string)?.trim() || undefined,
      phone: (body.phone as string)?.trim() || undefined,
      companyName: (body.companyName as string)?.trim() || undefined,
      billingAddress: body.billingAddress as { street?: string; city?: string; state?: string; zip?: string } | undefined,
      notes: (body.notes as string)?.trim() || undefined,
    });
    return apiResponse(customer, 201);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : "Failed to create customer");
  }
}
