import { NextRequest } from "next/server";
import { getApiOrg, apiResponse, apiError } from "@/lib/api";
import { listCustomers, createCustomer } from "@/lib/services/customers";

export async function GET() {
  const { org, error } = await getApiOrg();
  if (error) return error;
  const customers = await listCustomers(org!.id);
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
