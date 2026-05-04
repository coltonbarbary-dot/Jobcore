import { notFound } from "next/navigation";
import Link from "next/link";
import { requireOrg } from "@/lib/auth";
import { getLead } from "@/lib/services/leads";
import { listCustomers } from "@/lib/services/customers";
import { listActivityForEntity } from "@/lib/services/activity";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { LeadStatusBadge } from "@/components/operations/status-badge";
import { ActivityTimeline } from "@/components/operations/activity-timeline";
import { ConfirmDeleteDialog } from "@/components/operations/confirm-delete-dialog";
import { LeadConvertDialog } from "@/components/operations/leads/lead-convert-dialog";
import { formatDate, formatCurrency } from "@/lib/utils";
import { deleteLeadAction } from "../actions";

export default async function LeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab = "overview" } = await searchParams;
  const { org } = await requireOrg();

  const [lead, customers, activityLogs] = await Promise.all([
    getLead(org.id, id),
    listCustomers(org.id),
    listActivityForEntity(org.id, "lead", id),
  ]);

  if (!lead) notFound();

  const canConvert = lead.status !== "converted" && lead.status !== "lost";
  const TABS = ["overview", "activity"] as const;

  return (
    <PageShell
      title={lead.title}
      description={
        <span className="flex items-center gap-2">
          <LeadStatusBadge status={lead.status} />
          {lead.source && <span className="text-[#9ca3af]">· {lead.source}</span>}
        </span>
      }
      action={
        <div className="flex items-center gap-2">
          {canConvert && (
            <LeadConvertDialog
              leadId={id}
              leadTitle={lead.title}
              existingCustomers={customers.map((c) => ({ id: c.id, fullName: c.fullName }))}
            />
          )}
          <Button variant="secondary" size="sm" asChild>
            <Link href={`/operations/leads/${id}/edit`}>Edit</Link>
          </Button>
          <ConfirmDeleteDialog
            entityLabel="lead"
            entityName={lead.title}
            onConfirm={deleteLeadAction.bind(null, id)}
          />
        </div>
      }
    >
      {/* Tab Nav */}
      <div className="flex gap-1 border-b border-[#e5e7eb] mb-6">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/operations/leads/${id}?tab=${t}`}
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
              { label: "Status", value: <LeadStatusBadge status={lead.status} /> },
              { label: "Source", value: lead.source ?? "—" },
              { label: "Budget", value: lead.budgetEstimate ? formatCurrency(Number(lead.budgetEstimate)) : "—" },
              { label: "Created", value: formatDate(lead.createdAt) },
            ].map(({ label, value }) => (
              <div key={label}>
                <dt className="text-xs text-[#9ca3af] mb-0.5">{label}</dt>
                <dd className="text-sm text-[#0a0a0a]">{value}</dd>
              </div>
            ))}
          </dl>

          {lead.linkedCustomer && (
            <div>
              <p className="text-xs text-[#9ca3af] mb-1">Linked Customer</p>
              <Link
                href={`/operations/customers/${lead.linkedCustomer.id}`}
                className="text-sm font-medium text-[#0a0a0a] hover:underline"
              >
                {lead.linkedCustomer.fullName}
              </Link>
            </div>
          )}

          {lead.customer && (
            <div>
              <p className="text-xs text-[#9ca3af] mb-1">Converted Customer</p>
              <Link
                href={`/operations/customers/${lead.customer.id}`}
                className="text-sm font-medium text-[#0a0a0a] hover:underline"
              >
                {lead.customer.fullName}
              </Link>
            </div>
          )}

          {lead.description && (
            <div>
              <p className="text-xs text-[#9ca3af] mb-1">Description</p>
              <p className="text-sm text-[#374151] whitespace-pre-wrap">{lead.description}</p>
            </div>
          )}

          {lead.notes && (
            <div>
              <p className="text-xs text-[#9ca3af] mb-1">Notes</p>
              <p className="text-sm text-[#374151] whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}
        </div>
      )}

      {tab === "activity" && <ActivityTimeline logs={activityLogs} />}
    </PageShell>
  );
}
