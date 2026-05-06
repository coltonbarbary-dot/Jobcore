export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getApiOrg, apiResponse, apiError } from "@/lib/api";
import { recordPayment } from "@/lib/services/invoices";
import type { PaymentMethod } from "@prisma/client";

const VALID_METHODS: PaymentMethod[] = ["stripe", "cash", "check", "bank_transfer", "other"];

export async function POST(
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

  const amount = Number(body.amount);
  if (isNaN(amount) || amount <= 0) return apiError("amount must be a positive number");

  const method = body.method as PaymentMethod;
  if (!VALID_METHODS.includes(method)) return apiError(`method must be one of: ${VALID_METHODS.join(", ")}`);

  try {
    await recordPayment(org!.id, userId!, id, {
      amount,
      method,
      paidAt: body.paidAt ? new Date(body.paidAt as string) : new Date(),
      referenceNumber: (body.referenceNumber as string)?.trim() || undefined,
      notes: (body.notes as string)?.trim() || undefined,
    });
    return apiResponse({ recorded: true }, 201);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : "Failed to record payment");
  }
}
