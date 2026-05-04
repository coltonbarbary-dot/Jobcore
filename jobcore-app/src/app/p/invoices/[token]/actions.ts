"use server";

import { getInvoiceByToken } from "@/lib/services/invoices";
import { createInvoiceCheckoutSession } from "@/lib/stripe";

export async function createPaymentSessionAction(token: string): Promise<{ url?: string; error?: string }> {
  const invoice = await getInvoiceByToken(token);
  if (!invoice) return { error: "Invoice not found" };
  if (invoice.status === "paid") return { error: "This invoice is already paid" };
  if (invoice.status === "void") return { error: "This invoice has been voided" };

  const amountDue = Number(invoice.amountDue);
  if (amountDue <= 0) return { error: "No amount due on this invoice" };

  if (!invoice.publicToken) return { error: "Invoice payment link is not available" };

  try {
    const url = await createInvoiceCheckoutSession({
      invoiceId: invoice.id,
      publicToken: invoice.publicToken,
      amountDue,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customer.fullName,
      customerEmail: invoice.customer.email ?? null,
      orgName: "JobCore", // org name not available without auth — acceptable for public page
    });
    return { url };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create payment session" };
  }
}
