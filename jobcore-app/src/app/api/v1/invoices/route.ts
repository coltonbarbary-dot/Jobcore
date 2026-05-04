import { NextRequest } from "next/server";
import { getApiOrg, apiResponse, apiError } from "@/lib/api";
import { listInvoices, createInvoice } from "@/lib/services/invoices";

function parsePagination(req: NextRequest): { limit: number; offset: number } {
  const limit = Math.min(Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") ?? "50")), 100);
  const offset = Math.max(0, parseInt(req.nextUrl.searchParams.get("offset") ?? "0"));
  return { limit, offset };
}

export async function GET(req: NextRequest) {
  const { org, error } = await getApiOrg();
  if (error) return error;
  const { limit, offset } = parsePagination(req);
  const invoices = await listInvoices(org!.id, { limit, offset });
  return apiResponse(invoices);
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

  const customerId = body.customerId as string;
  if (!customerId) return apiError("customerId is required");

  try {
    const invoice = await createInvoice(org!.id, userId!, {
      customerId,
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
    return apiResponse(invoice, 201);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : "Failed to create invoice");
  }
}
