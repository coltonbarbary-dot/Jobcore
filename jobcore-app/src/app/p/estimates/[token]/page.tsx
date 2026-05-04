import { notFound } from "next/navigation";
import { getEstimateByToken, markEstimateViewed } from "@/lib/services/estimates";
import { ApprovalButtons } from "./approval-buttons";
import { formatCurrency } from "@/lib/utils";

export default async function PublicEstimatePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const estimate = await getEstimateByToken(token);
  if (!estimate) notFound();

  // Mark as viewed (no-op if already viewed, approved, or declined)
  await markEstimateViewed(token);

  const isExpired = estimate.validUntil && estimate.validUntil < new Date();
  const isFinal = estimate.status === "approved" || estimate.status === "declined";
  const canAct = !isFinal && !isExpired;

  return (
    <div className="min-h-screen bg-[#f9fafb] py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <p className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wider">Estimate</p>
          <h1 className="text-2xl font-bold text-[#0a0a0a]">{estimate.estimateNumber}</h1>
          <p className="text-[#6b7280]">Prepared for {estimate.customer.fullName}</p>
        </div>

        {/* Main card */}
        <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-sm overflow-hidden">
          {/* Title bar */}
          <div className="px-6 py-5 border-b border-[#f3f4f6]">
            <h2 className="text-lg font-semibold text-[#0a0a0a]">{estimate.title}</h2>
            {estimate.validUntil && (
              <p className={`text-sm mt-0.5 ${isExpired ? "text-[#dc2626]" : "text-[#6b7280]"}`}>
                {isExpired ? "Expired" : "Valid until"}: {new Date(estimate.validUntil).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            )}
          </div>

          {/* Line items */}
          {estimate.items.length > 0 && (
            <div className="px-6 py-4">
              <div className="space-y-0 divide-y divide-[#f3f4f6]">
                <div className="grid grid-cols-12 gap-2 pb-2">
                  <span className="col-span-7 text-xs font-semibold text-[#9ca3af] uppercase tracking-wide">Description</span>
                  <span className="col-span-2 text-xs font-semibold text-[#9ca3af] uppercase tracking-wide text-right">Qty</span>
                  <span className="col-span-3 text-xs font-semibold text-[#9ca3af] uppercase tracking-wide text-right">Amount</span>
                </div>
                {estimate.items.map((item) => (
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
              <span className="text-[#374151]">{formatCurrency(Number(estimate.subtotal))}</span>
            </div>
            {Number(estimate.taxRate) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[#6b7280]">Tax ({(Number(estimate.taxRate) * 100).toFixed(2)}%)</span>
                <span className="text-[#374151]">{formatCurrency(Number(estimate.taxAmount))}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t border-[#e5e7eb] pt-2 mt-1">
              <span className="text-[#0a0a0a]">Total</span>
              <span className="text-[#0a0a0a]">{formatCurrency(Number(estimate.total))}</span>
            </div>
          </div>

          {/* Notes */}
          {estimate.notes && (
            <div className="px-6 py-4 border-t border-[#f3f4f6]">
              <p className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wide mb-2">Notes</p>
              <p className="text-sm text-[#374151] whitespace-pre-wrap">{estimate.notes}</p>
            </div>
          )}

          {/* Terms */}
          {estimate.terms && (
            <div className="px-6 py-4 border-t border-[#f3f4f6]">
              <p className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wide mb-2">Terms &amp; Conditions</p>
              <p className="text-sm text-[#374151] whitespace-pre-wrap">{estimate.terms}</p>
            </div>
          )}
        </div>

        {/* Action area */}
        <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-sm px-6 py-6">
          {estimate.status === "approved" ? (
            <div className="text-center">
              <p className="text-[#16a34a] font-semibold text-lg">✓ Already Approved</p>
              <p className="text-[#6b7280] text-sm mt-1">
                Approved on {new Date(estimate.approvedAt!).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
          ) : estimate.status === "declined" ? (
            <div className="text-center">
              <p className="text-[#dc2626] font-semibold">This estimate was declined.</p>
            </div>
          ) : isExpired ? (
            <div className="text-center">
              <p className="text-[#dc2626] font-semibold">This estimate has expired.</p>
              <p className="text-[#6b7280] text-sm mt-1">Please contact us for an updated estimate.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-[#6b7280] text-center mb-4">
                Review the estimate above, then approve or decline.
              </p>
              <ApprovalButtons token={token} />
            </>
          )}
        </div>

        <p className="text-center text-xs text-[#9ca3af]">Powered by JobCore</p>
      </div>
    </div>
  );
}
