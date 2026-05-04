import { notFound } from "next/navigation";
import Link from "next/link";
import { requireOrg } from "@/lib/auth";
import { getJob } from "@/lib/services/jobs";
import { listActivityForEntity } from "@/lib/services/activity";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { JobStatusBadge } from "@/components/operations/status-badge";
import { ActivityTimeline } from "@/components/operations/activity-timeline";
import { ConfirmDeleteDialog } from "@/components/operations/confirm-delete-dialog";
import { JobStatusSelect } from "@/components/operations/jobs/job-status-select";
import { formatDate, formatCurrency } from "@/lib/utils";
import { deleteJobAction } from "../actions";
import { FilesTab } from "@/components/files/files-tab";

export default async function JobDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab = "overview" } = await searchParams;
  const { org } = await requireOrg();

  const [job, activityLogs] = await Promise.all([
    getJob(org.id, id),
    listActivityForEntity(org.id, "job", id),
  ]);

  if (!job) notFound();

  const TABS = ["overview", "items", "files", "activity"] as const;
  // Jobs created from an approved estimate start as draft with no scheduled dates.
  // Show a CTA until the contractor sets a start date.
  const needsScheduling = !!job.estimateId && !job.scheduledStart && job.status === "draft";

  return (
    <PageShell
      title={job.title}
      description={
        <span className="flex items-center gap-2">
          <JobStatusBadge status={job.status} />
          {job.jobType && <span className="text-[#9ca3af]">· {job.jobType}</span>}
        </span>
      }
      action={
        <div className="flex items-center gap-2">
          <JobStatusSelect jobId={job.id} currentStatus={job.status} />
          <Button variant="secondary" size="sm" asChild>
            <Link href={`/operations/jobs/${id}/edit`}>Edit</Link>
          </Button>
          <ConfirmDeleteDialog
            entityLabel="job"
            entityName={job.title}
            onConfirm={deleteJobAction.bind(null, id)}
          />
        </div>
      }
    >
      {/* Tab Nav */}
      <div className="flex gap-1 border-b border-[#e5e7eb] mb-6">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/operations/jobs/${id}?tab=${t}`}
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
          {/* Schedule Job CTA — shown for jobs created from approved estimates */}
          {needsScheduling && (
            <div className="rounded-md bg-[#eff6ff] border border-[#bfdbfe] px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[#1e40af]">This job needs to be scheduled</p>
                <p className="text-xs text-[#3b82f6] mt-0.5">
                  Set a start date so it appears on your calendar.
                </p>
              </div>
              <Button size="sm" asChild>
                <Link href={`/operations/jobs/${id}/edit`}>Schedule Job →</Link>
              </Button>
            </div>
          )}

          {job.estimateId && (
            <div>
              <p className="text-xs text-[#9ca3af] mb-1">From Estimate</p>
              <Link href={`/operations/estimates/${job.estimateId}`} className="text-sm text-[#2563eb] hover:underline">
                View approved estimate →
              </Link>
            </div>
          )}

          <dl className="grid grid-cols-2 gap-4">
            {[
              { label: "Status", value: <JobStatusBadge status={job.status} /> },
              { label: "Priority", value: job.priority.charAt(0).toUpperCase() + job.priority.slice(1) },
              { label: "Customer", value: (
                <Link href={`/operations/customers/${job.customer.id}`} className="text-sm font-medium text-[#0a0a0a] hover:underline">
                  {job.customer.fullName}
                </Link>
              )},
              { label: "Total", value: Number(job.totalAmount) > 0 ? formatCurrency(Number(job.totalAmount)) : "—" },
              { label: "Scheduled Start", value: job.scheduledStart ? formatDate(job.scheduledStart) : "—" },
              { label: "Scheduled End", value: job.scheduledEnd ? formatDate(job.scheduledEnd) : "—" },
              { label: "Actual Start", value: job.actualStart ? formatDate(job.actualStart) : "—" },
              { label: "Actual End", value: job.actualEnd ? formatDate(job.actualEnd) : "—" },
              { label: "Created", value: formatDate(job.createdAt) },
            ].map(({ label, value }) => (
              <div key={label}>
                <dt className="text-xs text-[#9ca3af] mb-0.5">{label}</dt>
                <dd className="text-sm text-[#0a0a0a]">{value}</dd>
              </div>
            ))}
          </dl>

          {job.description && (
            <div>
              <p className="text-xs text-[#9ca3af] mb-1">Description</p>
              <p className="text-sm text-[#374151] whitespace-pre-wrap">{job.description}</p>
            </div>
          )}

          {job.notes && (
            <div>
              <p className="text-xs text-[#9ca3af] mb-1">Notes</p>
              <p className="text-sm text-[#374151] whitespace-pre-wrap">{job.notes}</p>
            </div>
          )}
        </div>
      )}

      {tab === "items" && (
        <div className="max-w-2xl">
          {job.items.length === 0 ? (
            <p className="text-sm text-[#9ca3af]">No line items on this job.</p>
          ) : (
            <div className="space-y-0 rounded-lg border border-[#e5e7eb] overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-[#f9fafb] border-b border-[#e5e7eb]">
                <span className="col-span-6 text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Description</span>
                <span className="col-span-2 text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Qty</span>
                <span className="col-span-2 text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Unit Price</span>
                <span className="col-span-2 text-right text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Subtotal</span>
              </div>
              {job.items.map((item) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-[#f3f4f6] last:border-0">
                  <span className="col-span-6 text-sm text-[#0a0a0a]">{item.description}</span>
                  <span className="col-span-2 text-sm text-[#6b7280]">{Number(item.quantity)}</span>
                  <span className="col-span-2 text-sm text-[#6b7280]">{formatCurrency(Number(item.unitPrice))}</span>
                  <span className="col-span-2 text-right text-sm text-[#374151] font-medium">{formatCurrency(Number(item.subtotal))}</span>
                </div>
              ))}
              {Number(job.totalAmount) > 0 && (
                <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-[#f9fafb]">
                  <span className="col-span-10 text-right text-sm font-semibold text-[#0a0a0a]">Total</span>
                  <span className="col-span-2 text-right text-sm font-semibold text-[#0a0a0a]">{formatCurrency(Number(job.totalAmount))}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "files" && (
        <FilesTab
          organizationId={org.id}
          entityType="job"
          entityId={job.id}
          customerId={job.customerId}
          jobId={job.id}
        />
      )}

      {tab === "activity" && <ActivityTimeline logs={activityLogs} />}
    </PageShell>
  );
}
