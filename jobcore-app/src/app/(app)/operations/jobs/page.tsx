import Link from "next/link";
import { requireOrg } from "@/lib/auth";
import { listJobs } from "@/lib/services/jobs";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/operations/empty-state";
import { JobStatusBadge } from "@/components/operations/status-badge";
import { formatDate, formatCurrency } from "@/lib/utils";

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = "all" } = await searchParams;
  const { org } = await requireOrg();
  const allJobs = await listJobs(org.id);

  const jobs = status === "all" ? allJobs : allJobs.filter((j) => j.status === status);

  const counts = STATUS_TABS.reduce(
    (acc, tab) => {
      acc[tab.value] = tab.value === "all" ? allJobs.length : allJobs.filter((j) => j.status === tab.value).length;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <PageShell
      title="Jobs"
      description={allJobs.length > 0 ? `${allJobs.length} job${allJobs.length !== 1 ? "s" : ""}` : undefined}
      action={
        <Button size="sm" asChild>
          <Link href="/operations/jobs/new">+ New Job</Link>
        </Button>
      }
    >
      {/* Status filter tabs */}
      <div className="flex gap-1 border-b border-[#e5e7eb] mb-6 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/operations/jobs${tab.value !== "all" ? `?status=${tab.value}` : ""}`}
            className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              status === tab.value || (tab.value === "all" && status === "all")
                ? "border-[#0a0a0a] text-[#0a0a0a]"
                : "border-transparent text-[#6b7280] hover:text-[#0a0a0a]"
            }`}
          >
            {tab.label}
            {counts[tab.value] > 0 && (
              <span className="ml-1.5 text-xs text-[#9ca3af]">{counts[tab.value]}</span>
            )}
          </Link>
        ))}
      </div>

      {jobs.length === 0 ? (
        <EmptyState
          title={status === "all" ? "No jobs yet" : `No ${status.replace("_", " ")} jobs`}
          description={
            status === "all"
              ? "Create your first job to start scheduling and tracking work."
              : "Jobs with this status will appear here."
          }
          actionLabel={status === "all" ? "New Job" : undefined}
          actionHref={status === "all" ? "/operations/jobs/new" : undefined}
        />
      ) : (
        <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#f3f4f6] bg-[#f9fafb]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Job</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wide hidden sm:table-cell">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wide hidden md:table-cell">Scheduled</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#6b7280] uppercase tracking-wide hidden lg:table-cell">Total</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wide hidden lg:table-cell">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3f4f6]">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-[#f9fafb] transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/operations/jobs/${job.id}`} className="font-medium text-[#0a0a0a] hover:underline">
                      {job.title}
                    </Link>
                    {job.jobType && (
                      <p className="text-xs text-[#9ca3af] mt-0.5">{job.jobType}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#6b7280] hidden sm:table-cell">
                    <Link href={`/operations/customers/${job.customer.id}`} className="hover:underline">
                      {job.customer.fullName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <JobStatusBadge status={job.status} />
                  </td>
                  <td className="px-4 py-3 text-[#6b7280] hidden md:table-cell">
                    {job.scheduledStart ? formatDate(job.scheduledStart) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-[#374151] hidden lg:table-cell">
                    {Number(job.totalAmount) > 0 ? formatCurrency(Number(job.totalAmount)) : "—"}
                  </td>
                  <td className="px-4 py-3 text-[#9ca3af] hidden lg:table-cell">{formatDate(job.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}
