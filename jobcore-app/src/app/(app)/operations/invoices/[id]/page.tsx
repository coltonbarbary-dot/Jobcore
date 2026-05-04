import { notFound } from "next/navigation";
import Link from "next/link";
import { requireOrg } from "@/lib/auth";
import { getInvoice } from "@/lib/services/invoices";
import { listActivityForEntity } from "@/lib/services/activity";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { InvoiceStatusBadge } from "@/components/operations/status-badge";
import { ActivityTimeline } from "@/components/operations/activity-timeline";
import { ConfirmDeleteDialog } from "@/components/operations/confirm-delete-dialog";
import { SendInvoiceButton } from "@/components/operations/invoices/send-invoice-button";
import { RecordPaymentDialog } from "@/components/operations/invoices/record-payment-dialog";
import { formatDate, formatCurrency } from "@/lib/utils";
import { getInvoicePublicUrl } from "@/lib/email";
import { deleteInvoiceAction, voidInvoiceAction } from "../actions";

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab = "overview" } = await searchParams;
  const { org } = await requireOrg();

  const [invoice, activityLogs] = await Promise.all([
    getInvoice(org.id, id),
    listActivityForEntity(org.id, "invoice", id),
  ]);

  if (!invoice) notFound();

  const TABS = ["overview", "items", "payments", "activity"] as const;

  const now = new Date();
  const isOverdue =
    !!invoice.dueDate &&
    invoice.dueDate < now &&
    invoice.status !== "paid" &&
    invoice.status !== "void";

  const isFinal = invoice.status === "paid" || invoice.status === "void";
  const canEdit = !isFinal;
  const canSend = !isFinal;
  const canRecordPayment = !isFinal;
  const canVoid = !isFinal && invoice.status !== "draft";
  const canDelete = invoice.status === "draft";
  const publicUrl = invoice.publicToken ? getInvoicePublicUrl(invoice.publicToken) : null;

  return (
    <PageShell
      title={invoice.invoiceNumber}
      description={
        <span className="flex items-center gap-2">
          <InvoiceStatusBadge status={invoice.status} />
          {isOverdue && invoice.status !== "overdue" && (
            <span className="text-xs font-medium text-[#b45309] bg-[#fffbeb] border border-[#fde68a] rounded px-1.5 py-0.5">
              Overdue
            </span>
          )}
        </span>
      }
      action={
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {canSend && (
            <SendInvoiceButton invoiceId={id} customerEmail={invoice.customer.email ?? null} />
          )}
          {canRecordPayment && (
            <RecordPaymentDialog invoiceId={id} amountDue={Number(invoice.amountDue)} />
          )}
          {canEdit && (
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/operations/invoices/${id}/edit`}>Edit</Link>
            </Button>
          )}
          {canVoid && (
            <ConfirmDeleteDialog
              entityLabel="invoice"
              entityName={`void ${invoice.invoiceNumber}`}
              confirmLabel="Void Invoice"
              onConfirm={voidInvoiceAction.bind(null, id)}
            />
          )}
          {canDelete && (
            <ConfirmDeleteDialog
              entityLabel="invoice"
              entityName={invoice.invoiceNumber}
              onConfirm={deleteInvoiceAction.bind(null, id)}
            />
          )}
        </div>
      }
    >
      <div className="flex gap-1 border-b border-[#e5e7eb] mb-6">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/operations/invoices/${id}?tab=${t}`}
            className={`px-3 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              tab === t
                ? "border-[#0a0a0a] text-[#0a0a0a]"
                : "border-transparent text-[#6b7280] hover:text-[#0a0a0a]"
            }`}
          >
            {t}
          </Link>
        ))}
      </div>

      {tab === "overview" && (
        <div className="max-w-lg space-y-5">
          {isOverdue && (
            <div className="rounded-md bg-[#fffbeb] border border-[#fde68a] px-4 py-3 text-sm text-[#92400e]">
              <strong>This invoice is overdue.</strong> Due date was {formatDate(invoice.dueDate!)}.
            </div>
          )}

          {invoice.job && (
            <div>
              <p className="text-xs text-[#9ca3af] mb-1">Linked Job</p>
              <Link href={`/operations/jobs/${invoice.job.id}`} className="text-sm text-[#2563eb] hover:underline">
                {invoice.job.title} →
              </Link>
            </div>
          )}

          <dl className="grid grid-cols-2 gap-4">
            {[
              { label: "Status", value: <InvoiceStatusBadge status={invoice.status} /> },
              {
                label: "Customer",
                value: (
                  <Link href={`/operations/customers/${invoice.customer.id}`} className="text-sm font-medium text-[#0a0a0a] hover:underline">
                    {invoice.customer.fullName}
                  </Link>
                ),
              },
              { label: "Due Date", value: invoice.dueDate ? formatDate(invoice.dueDate) : "—" },
              { label: "Created", value: formatDate(invoice.createdAt) },
              { label: "Sent", value: invoice.sentAt ? formatDate(invoice.sentAt) : "—" },
              { label: "Paid", value: invoice.paidAt ? formatDate(invoice.paidAt) : "—" },
            ].map(({ label, value }) => (
              <div key={label}>
                <dt className="text-xs text-[#9ca3af] mb-0.5">{label}</dt>
                <dd className="text-sm text-[#0a0a0a]">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="rounded-md border border-[#e5e7eb] p-4 space-y-1.5">
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
            <div className="flex justify-between text-sm font-semibold border-t border-[#e5e7eb] pt-1.5 mt-1.5">
              <span className="text-[#0a0a0a]">Total</span>
              <span className="text-[#0a0a0a]">{formatCurrency(Number(invoice.total))}</span>
            </div>
            {Number(invoice.amountPaid) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[#6b7280]">Paid</span>
                <span className="text-[#16a34a]">−{formatCurrency(Number(invoice.amountPaid))}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold border-t border-[#e5e7eb] pt-1.5 mt-1.5">
              <span className="text-[#0a0a0a]">Amount Due</span>
              <span className={Number(invoice.amountDue) > 0 ? "text-[#dc2626]" : "text-[#16a34a]"}>
                {formatCurrency(Number(invoice.amountDue))}
              </span>
            </div>
          </div>

          {publicUrl && (
            <div>
              <p className="text-xs text-[#9ca3af] mb-1">Public Payment Link</p>
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#2563eb] hover:underline break-all"
              >
                {publicUrl}
              </a>
            </div>
          )}

          {invoice.notes && (
            <div>
              <p className="text-xs text-[#9ca3af] mb-1">Notes</p>
              <p className="text-sm text-[#374151] whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

          {invoice.terms && (
            <div>
              <p className="text-xs text-[#9ca3af] mb-1">Terms &amp; Conditions</p>
              <p className="text-sm text-[#374151] whitespace-pre-wrap">{invoice.terms}</p>
            </div>
          )}
        </div>
      )}

      {tab === "items" && (
        <div className="max-w-2xl">
          {invoice.items.length === 0 ? (
            <p className="text-sm text-[#9ca3af]">No line items on this invoice.</p>
          ) : (
            <div className="rounded-lg border border-[#e5e7eb] overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-[#f9fafb] border-b border-[#e5e7eb]">
                <span className="col-span-6 text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Description</span>
                <span className="col-span-2 text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Qty</span>
                <span className="col-span-2 text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Unit Price</span>
                <span className="col-span-2 text-right text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Subtotal</span>
              </div>
              {invoice.items.map((item) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-[#f3f4f6] last:border-0">
                  <span className="col-span-6 text-sm text-[#0a0a0a]">{item.description}</span>
                  <span className="col-span-2 text-sm text-[#6b7280]">{Number(item.quantity)}</span>
                  <span className="col-span-2 text-sm text-[#6b7280]">{formatCurrency(Number(item.unitPrice))}</span>
                  <span className="col-span-2 text-right text-sm font-medium text-[#374151]">{formatCurrency(Number(item.subtotal))}</span>
                </div>
              ))}
              <div className="px-4 py-3 bg-[#f9fafb] space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-[#6b7280]">Subtotal</span>
                  <span>{formatCurrency(Number(invoice.subtotal))}</span>
                </div>
                {Number(invoice.taxRate) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6b7280]">Tax ({(Number(invoice.taxRate) * 100).toFixed(2)}%)</span>
                    <span>{formatCurrency(Number(invoice.taxAmount))}</span>
                  </div>
                )}
                {Number(invoice.discountAmount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6b7280]">Discount</span>
                    <span>−{formatCurrency(Number(invoice.discountAmount))}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-semibold border-t border-[#e5e7eb] pt-1">
                  <span>Total</span>
                  <span>{formatCurrency(Number(invoice.total))}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "payments" && (
        <div className="max-w-xl">
          {invoice.payments.length === 0 ? (
            <p className="text-sm text-[#9ca3af]">No payments recorded yet.</p>
          ) : (
            <div className="rounded-lg border border-[#e5e7eb] overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-[#f9fafb] border-b border-[#e5e7eb]">
                <span className="col-span-3 text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Date</span>
                <span className="col-span-3 text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Method</span>
                <span className="col-span-3 text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Reference</span>
                <span className="col-span-3 text-right text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Amount</span>
              </div>
              {invoice.payments.map((pmt) => (
                <div key={pmt.id} className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-[#f3f4f6] last:border-0">
                  <span className="col-span-3 text-sm text-[#6b7280]">{pmt.paidAt ? formatDate(pmt.paidAt) : "—"}</span>
                  <span className="col-span-3 text-sm text-[#6b7280] capitalize">{pmt.method.replace("_", " ")}</span>
                  <span className="col-span-3 text-sm text-[#9ca3af]">{pmt.referenceNumber ?? "—"}</span>
                  <span className="col-span-3 text-right text-sm font-medium text-[#16a34a]">{formatCurrency(Number(pmt.amount))}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "activity" && <ActivityTimeline logs={activityLogs} />}
    </PageShell>
  );
}
