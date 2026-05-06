export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getApiOrg, apiResponse, apiError } from "@/lib/api";
import { getCustomer, updateCustomer, deleteCustomer } from "@/lib/services/customers";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { org, error } = await getApiOrg();
  if (error) return error;
  const customer = await getCustomer(org!.id, id);
  if (!customer) return apiError("Customer not found", 404);
  return apiResponse(customer);
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
    const customer = await updateCustomer(org!.id, userId!, id, {
      fullName: (body.fullName as string)?.trim() || undefined,
      email: body.email !== undefined ? ((body.email as string)?.trim() || undefined) : undefined,
      phone: body.phone !== undefined ? ((body.phone as string)?.trim() || undefined) : undefined,
      companyName: body.companyName !== undefined ? ((body.companyName as string)?.trim() || undefined) : undefined,
      billingAddress: body.billingAddress as { street?: string; city?: string; state?: string; zip?: string } | undefined,
      notes: body.notes !== undefined ? ((body.notes as string)?.trim() || undefined) : undefined,
    });
    return apiResponse(customer);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : "Failed to update customer");
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { org, userId, error } = await getApiOrg();
  if (error) return error;

  try {
    await deleteCustomer(org!.id, userId!, id);
    return apiResponse({ deleted: true });
  } catch (e) {
    return apiError(e instanceof Error ? e.message : "Failed to delete customer");
  }
}
