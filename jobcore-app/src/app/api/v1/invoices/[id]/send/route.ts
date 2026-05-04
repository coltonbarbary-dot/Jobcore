import { NextRequest } from "next/server";
import { getApiOrg, apiResponse, apiError } from "@/lib/api";
import { getInvoice, markInvoiceSent } from "@/lib/services/invoices";
import { sendInvoiceEmail } from "@/lib/email";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { org, userId, error } = await getApiOrg();
  if (error) return error;
  const { id } = await params;

  const invoice = await getInvoice(org!.id, id);
  if (!invoice) return apiError("Invoice not found", 404);

  const recipientEmail = invoice.customer.email;
  if (!recipientEmail) return apiError("Customer has no email address");

  if (invoice.status === "paid" || invoice.status === "void") {
    return apiError(`Cannot send a ${invoice.status} invoice`);
  }

  const token = invoice.publicToken ?? crypto.randomUUID();

  try {
    await sendInvoiceEmail({
      to: recipientEmail,
      customerName: invoice.customer.fullName,
      orgName: org!.name,
      invoiceNumber: invoice.invoiceNumber,
      amountDue: Number(invoice.amountDue),
      token,
      dueDate: invoice.dueDate,
    });
  } catch (e) {
    return apiError(e instanceof Error ? e.message : "Failed to send email");
  }

  await markInvoiceSent(org!.id, userId!, id, token);
  return apiResponse({ sent: true });
}
