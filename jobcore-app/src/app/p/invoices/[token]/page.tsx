import { notFound } from "next/navigation";
import { getInvoiceByToken, markInvoiceViewed } from "@/lib/services/invoices";
import { PayNowButton } from "./pay-now-button";
import { formatCurrency } from "@/lib/utils";

export default async function PublicInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const { token } = await params;
  const { paid } = await searchParams;

  const invoice = await getInvoiceByToken(token);
  if (!invoice) notFound();

  await markInvoiceViewed(token);

  const now = new Date();
  const isOverdue =
    !!invoice.dueDate &&
    invoice.dueDate < now &&
    invoice.status !== "paid" &&
    invoice.status !== "void";

  const isPaid = invoice.status === "paid";
  const isVoid = invoice.status === "void";
  const canPay = !isPaid && !isVoid && Number(invoice.amountDue) > 0;
  const justPaid = paid === "1";

  return (
    <div className="min-h-screen bg-[#f9fafb] py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <p className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wider">Invoice</p>
          <h1 className="text-2xl font-bold text-[#0a0a0a]">{invoice.invoiceNumber}</h1>
          <p className="text-[#6b7280]">Billed to {invoice.customer.fullName}</p>
        </div>

        {/* Main card */}
        <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-sm overflow-hidden">
          {/* Title bar */}
          <div className="px-6 py-5 border-b border-[#f3f4f6]">
            <div className="flex items-center justify-between gap-4">
              <div>
                {invoice.dueDate && (
                  <p className={`text-sm mt-0.5 ${isOverdue ? "text-[#dc2626]" : "text-[#6b7280]"}`}>
                    {isOverdue ? "Was due" : "Due"}: {new Date(invoice.dueDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Line items */}
          {invoice.items.length > 0 && (
            <div className="px-6 py-4">
              <div className="space-y-0 divide-y divide-[#f3f4f6]">
                <div className="grid grid-cols-12 gap-2 pb-2">
                  <span className="col-span-7 text-xs font-semibold text-[#9ca3af] uppercase tracking-wide">Description</span>
                  <span className="col-span-2 text-xs font-semibold text-[#9ca3af] uppercase tracking-wide text-right">Qty</span>
                  <span className="col-span-3 text-xs font-semibold text-[#9ca3af] uppercase tracking-wide text-right">Amount</span>
                </div>
                {invoice.items.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 py-3">
                    <span className="col-span-7 text-sm text-[#0a0a0a]">{item.description}</span>
                    <span className="col-span-2 text-sm text-[#6b7280] text-right">{Number(item.quantity)}</span>
                    <span className="col-span-3 text-sm text-[#374151] text-right">{formatCurrency(Number(item.subtotal))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Totals */}
          <div className="px-6 py-4 bg-[#f9fafb] border-t border-[#e5e7eb] space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-[#6b7280]">Subtotal</span>
              <span className="text-[#374151]">{formatCurrency(Number(invoice.subtotal))}</span>
            </div>
            {Number(invoice.taxRate) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[#6b7280]">Tax ({(Number(invoice.taxRate) * 100).toFixed(2)}%)</span>
                <span className="text-[#374151]">{formatCurrency(Number(invoice.taxAmount))}</span>
              </div>
            )}
            {Number(invoice.discountAmount) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[#6b7280]">Discount</span>
                <span className="text-[#374151]">−{formatCurrency(Number(invoice.discountAmount))}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t border-[#e5e7eb] pt-2 mt-1">
              <span className="text-[#0a0a0a]">Total</span>
              <span className="text-[#0a0a0a]">{formatCurrency(Number(invoice.total))}</span>
            </div>
            {Number(invoice.amountPaid) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[#6b7280]">Paid</span>
                <span className="text-[#16a34a]">−{formatCurrency(Number(invoice.amountPaid))}</span>
              </div>
            )}
            {!isPaid && (
              <div className="flex justify-between font-bold text-lg border-t border-[#e5e7eb] pt-2 mt-1">
                <span className="text-[#0a0a0a]">Amount Due</span>
                <span className="text-[#0a0a0a]">{formatCurrency(Number(invoice.amountDue))}</span>
              </div>
            )}
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="px-6 py-4 border-t border-[#f3f4f6]">
              <p className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wide mb-2">Notes</p>
              <p className="text-sm text-[#374151] whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

          {/* Terms */}
          {invoice.terms && (
            <div className="px-6 py-4 border-t border-[#f3f4f6]">
              <p className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wide mb-2">Terms &amp; Conditions</p>
              <p className="text-sm text-[#374151] whitespace-pre-wrap">{invoice.terms}</p>
            </div>
          )}
        </div>

        {/* Action area */}
        <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-sm px-6 py-6">
          {justPaid ? (
            <div className="text-center">
              <p className="text-[#16a34a] font-semibold text-lg">✓ Payment received — thank you!</p>
              <p className="text-[#6b7280] text-sm mt-1">Your payment is being processed. You may close this page.</p>
            </div>
          ) : isPaid ? (
            <div className="text-center">
              <p className="text-[#16a34a] font-semibold text-lg">✓ Invoice Paid</p>
              <p className="text-[#6b7280] text-sm mt-1">
                Paid on {invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"}
              </p>
            </div>
          ) : isVoid ? (
            <div className="text-center">
              <p className="text-[#6b7280] font-semibold">This invoice has been voided.</p>
            </div>
          ) : canPay ? (
            <>
              <p className="text-sm text-[#6b7280] text-center mb-4">
                Pay securely with your card. You will be redirected to Stripe.
              </p>
              <PayNowButton token={token} />
            </>
          ) : (
            <div className="text-center">
              <p className="text-sm text-[#6b7280]">No payment required.</p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-[#9ca3af]">Powered by JobCore</p>
      </div>
    </div>
  );
}
