import { notFound } from "next/navigation";
import Link from "next/link";
import { requireOrg } from "@/lib/auth";
import { getEstimate } from "@/lib/services/estimates";
import { listActivityForEntity } from "@/lib/services/activity";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { EstimateStatusBadge } from "@/components/operations/status-badge";
import { ActivityTimeline } from "@/components/operations/activity-timeline";
import { ConfirmDeleteDialog } from "@/components/operations/confirm-delete-dialog";
import { SendEstimateButton } from "@/components/operations/estimates/send-estimate-button";
import { formatDate, formatCurrency } from "@/lib/utils";
import { deleteEstimateAction } from "../actions";
import { getEstimatePublicUrl } from "@/lib/email";

export default async function EstimateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab = "overview" } = await searchParams;
  const { org } = await requireOrg();

  const [estimate, activityLogs] = await Promise.all([
    getEstimate(org.id, id),
    listActivityForEntity(org.id, "estimate", id),
  ]);

  if (!estimate) notFound();

  const TABS = ["overview", "items", "activity"] as const;
  const canEdit = estimate.status === "draft" || estimate.status === "sent" || estimate.status === "viewed";
  const canDelete = estimate.status === "draft";
  const canSend = estimate.status !== "approved" && estimate.status !== "declined";
  const publicUrl = estimate.approvalToken ? getEstimatePublicUrl(estimate.approvalToken) : null;

  return (
    <PageShell
      title={estimate.estimateNumber}
      description={
        <span className="flex items-center gap-2">
          <EstimateStatusBadge status={estimate.status} />
          <span className="text-[#9ca3af]">· {estimate.title}</span>
        </span>
      }
      action={
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {canSend && (
            <SendEstimateButton estimateId={id} customerEmail={estimate.customer.email ?? null} />
          )}
          {canEdit && (
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/operations/estimates/${id}/edit`}>Edit</Link>
            </Button>
          )}
          {canDelete && (
            <ConfirmDeleteDialog
              entityLabel="estimate"
              entityName={estimate.estimateNumber}
              onConfirm={deleteEstimateAction.bind(null, id)}
            />
          )}
        </div>
      }
    >
      <div className="flex gap-1 border-b border-[#e5e7eb] mb-6">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/operations/estimates/${id}?tab=${t}`}
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
        <div className="max-w-lg space-y-6">
          <dl className="grid grid-cols-2 gap-4">
            {[
              { label: "Status", value: <EstimateStatusBadge status={estimate.status} /> },
              {
                label: "Customer",
                value: (
                  <Link href={`/operations/customers/${estimate.customer.id}`} className="text-sm font-medium text-[#0a0a0a] hover:underline">
                    {estimate.customer.fullName}
                  </Link>
                ),
              },
              { label: "Valid Until", value: estimate.validUntil ? formatDate(estimate.validUntil) : "—" },
              { label: "Created", value: formatDate(estimate.createdAt) },
              { label: "Sent", value: estimate.sentAt ? formatDate(estimate.sentAt) : "—" },
              { label: "Viewed", value: estimate.viewedAt ? formatDate(estimate.viewedAt) : "—" },
              { label: "Approved", value: estimate.approvedAt ? formatDate(estimate.approvedAt) : "—" },
              { label: "Declined", value: estimate.declinedAt ? formatDate(estimate.declinedAt) : "—" },
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
              <span className="text-[#374151]">{formatCurrency(Number(estimate.subtotal))}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#6b7280]">Tax ({(Number(estimate.taxRate) * 100).toFixed(2)}%)</span>
              <span className="text-[#374151]">{formatCurrency(Number(estimate.taxAmount))}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold border-t border-[#e5e7eb] pt-1.5 mt-1.5">
              <span className="text-[#0a0a0a]">Total</span>
              <span className="text-[#0a0a0a]">{formatCurrency(Number(estimate.total))}</span>
            </div>
          </div>

          {publicUrl && (
            <div>
              <p className="text-xs text-[#9ca3af] mb-1">Public Approval Link</p>
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

          {estimate.notes && (
            <div>
              <p className="text-xs text-[#9ca3af] mb-1">Notes</p>
              <p className="text-sm text-[#374151] whitespace-pre-wrap">{estimate.notes}</p>
            </div>
          )}

          {estimate.terms && (
            <div>
              <p className="text-xs text-[#9ca3af] mb-1">Terms &amp; Conditions</p>
              <p className="text-sm text-[#374151] whitespace-pre-wrap">{estimate.terms}</p>
            </div>
          )}
        </div>
      )}

      {tab === "items" && (
        <div className="max-w-2xl">
          {estimate.items.length === 0 ? (
            <p className="text-sm text-[#9ca3af]">No line items on this estimate.</p>
          ) : (
            <div className="rounded-lg border border-[#e5e7eb] overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-[#f9fafb] border-b border-[#e5e7eb]">
                <span className="col-span-6 text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Description</span>
                <span className="col-span-2 text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Qty</span>
                <span className="col-span-2 text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Unit Price</span>
                <span className="col-span-2 text-right text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Subtotal</span>
              </div>
              {estimate.items.map((item) => (
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
                  <span>{formatCurrency(Number(estimate.subtotal))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#6b7280]">Tax ({(Number(estimate.taxRate) * 100).toFixed(2)}%)</span>
                  <span>{formatCurrency(Number(estimate.taxAmount))}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold border-t border-[#e5e7eb] pt-1">
                  <span>Total</span>
                  <span>{formatCurrency(Number(estimate.total))}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "activity" && <ActivityTimeline logs={activityLogs} />}
    </PageShell>
  );
}
