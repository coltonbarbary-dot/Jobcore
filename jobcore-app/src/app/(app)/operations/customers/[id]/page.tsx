import { notFound } from "next/navigation";
import Link from "next/link";
import { requireOrg } from "@/lib/auth";
import { getCustomer } from "@/lib/services/customers";
import { listActivityForEntity } from "@/lib/services/activity";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { ActivityTimeline } from "@/components/operations/activity-timeline";
import { ConfirmDeleteDialog } from "@/components/operations/confirm-delete-dialog";
import { JobStatusBadge } from "@/components/operations/status-badge";
import { formatDate, formatCurrency } from "@/lib/utils";
import { deleteCustomerAction } from "../actions";
import { FilesTab } from "@/components/files/files-tab";

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab = "overview" } = await searchParams;
  const { org } = await requireOrg();

  const [customer, activityLogs] = await Promise.all([
    getCustomer(org.id, id),
    listActivityForEntity(org.id, "customer", id),
  ]);

  if (!customer) notFound();

  const address = customer.billingAddress as {
    street?: string; city?: string; state?: string; zip?: string;
  } | null;

  const addressLine = address
    ? [address.street, address.city, address.state, address.zip].filter(Boolean).join(", ")
    : null;

  const TABS = ["overview", "jobs", "files", "activity"] as const;

  return (
    <PageShell
      title={customer.fullName}
      description={customer.companyName ?? undefined}
      action={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" asChild>
            <Link href={`/operations/customers/${id}/edit`}>Edit</Link>
          </Button>
          <ConfirmDeleteDialog
            entityLabel="customer"
            entityName={customer.fullName}
            onConfirm={deleteCustomerAction.bind(null, id)}
          />
        </div>
      }
    >
      {/* Tab Nav */}
      <div className="flex gap-1 border-b border-[#e5e7eb] mb-6">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/operations/customers/${id}?tab=${t}`}
            className={`px-3 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              tab === t
                ? "border-[#0a0a0a] text-[#0a0a0a]"
                : "border-transparent text-[#6b7280] hover:text-[#0a0a0a]"
            }`}
          >
            {t}
            {t === "jobs" && customer._count.jobs > 0 && (
              <span className="ml-1.5 text-xs bg-[#f3f4f6] text-[#6b7280] rounded-full px-1.5 py-0.5">
                {customer._count.jobs}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Overview */}
      {tab === "overview" && (
        <div className="max-w-lg space-y-6">
          <dl className="grid grid-cols-2 gap-4">
            {[
              { label: "Email", value: customer.email },
              { label: "Phone", value: customer.phone },
              { label: "Address", value: addressLine },
              { label: "Added", value: formatDate(customer.createdAt) },
            ].map(({ label, value }) => (
              <div key={label}>
                <dt className="text-xs text-[#9ca3af] mb-0.5">{label}</dt>
                <dd className="text-sm text-[#0a0a0a]">{value || "—"}</dd>
              </div>
            ))}
          </dl>
          {customer.notes && (
            <div>
              <p className="text-xs text-[#9ca3af] mb-1">Notes</p>
              <p className="text-sm text-[#374151] whitespace-pre-wrap">{customer.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Jobs */}
      {tab === "jobs" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-[#6b7280]">{customer.jobs.length} job{customer.jobs.length !== 1 ? "s" : ""}</p>
            <Button size="sm" asChild>
              <Link href={`/operations/jobs/new?customerId=${id}`}>+ New Job</Link>
            </Button>
          </div>
          {customer.jobs.length === 0 ? (
            <p className="text-sm text-[#9ca3af] py-8 text-center">No jobs for this customer yet.</p>
          ) : (
            <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#f3f4f6] bg-[#f9fafb]">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#6b7280] uppercase tracking-wide hidden md:table-cell">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wide hidden md:table-cell">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f3f4f6]">
                  {customer.jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-[#f9fafb]">
                      <td className="px-4 py-3">
                        <Link href={`/operations/jobs/${job.id}`} className="font-medium text-[#0a0a0a] hover:underline">
                          {job.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <JobStatusBadge status={job.status} />
                      </td>
                      <td className="px-4 py-3 text-right text-[#6b7280] hidden md:table-cell">
                        {job.totalAmount ? formatCurrency(Number(job.totalAmount)) : "—"}
                      </td>
                      <td className="px-4 py-3 text-[#9ca3af] hidden md:table-cell">{formatDate(job.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "files" && (
        <FilesTab
          organizationId={org.id}
          entityType="customer"
          entityId={customer.id}
          customerId={customer.id}
        />
      )}

      {/* Activity */}
      {tab === "activity" && <ActivityTimeline logs={activityLogs} />}
    </PageShell>
  );
}
