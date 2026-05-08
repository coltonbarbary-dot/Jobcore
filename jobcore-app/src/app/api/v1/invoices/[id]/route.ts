export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getApiOrg, apiResponse, apiError } from "@/lib/api";
import { getInvoice, updateInvoice, deleteInvoice } from "@/lib/services/invoices";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { org, error } = await getApiOrg();
  if (error) return error;
  const { id } = await params;
  const invoice = await getInvoice(org!.id, id);
  if (!invoice) return apiError("Invoice not found", 404);
  return apiResponse(invoice);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { org, userId, error } = await getApiOrg();
  if (error) return error;
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body");
  }

  try {
    const invoice = await updateInvoice(org!.id, userId!, id, {
      customerId: (body.customerId as string) || undefined,
      jobId: (body.jobId as string) || undefined,
      dueDate: body.dueDate ? new Date(body.dueDate as string) : undefined,
      taxRate: body.taxRate !== undefined ? Number(body.taxRate) : undefined,
      discountAmount: body.discountAmount !== undefined ? Number(body.discountAmount) : undefined,
      notes: (body.notes as string)?.trim() || undefined,
      terms: (body.terms as string)?.trim() || undefined,
      items: Array.isArray(body.items)
        ? (body.items as Array<{ description: string; quantity: number; unitPrice: number }>).map((i) => ({
            description: String(i.description),
            quantity: Number(i.quantity),
            unitPrice: Number(i.unitPrice),
          }))
        : undefined,
    });
    return apiResponse(invoice);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : "Failed to update invoice");
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { org, userId, error } = await getApiOrg();
  if (error) return error;
  const { id } = await params;

  try {
    await deleteInvoice(org!.id, userId!, id);
    return apiResponse({ deleted: true });
  } catch (e) {
    return apiError(e instanceof Error ? e.message : "Failed to delete invoice");
  }
}