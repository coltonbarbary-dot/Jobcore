import Link from "next/link";
import { requireOrg } from "@/lib/auth";
import { listEstimates } from "@/lib/services/estimates";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/operations/empty-state";
import { EstimateStatusBadge } from "@/components/operations/status-badge";
import { formatDate, formatCurrency } from "@/lib/utils";

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "viewed", label: "Viewed" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
] as const;

export default async function EstimatesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = "all" } = await searchParams;
  const { org } = await requireOrg();
  const allEstimates = await listEstimates(org.id);

  const estimates = status === "all" ? allEstimates : allEstimates.filter((e) => e.status === status);

  const counts = STATUS_TABS.reduce((acc, tab) => {
    acc[tab.value] = tab.value === "all" ? allEstimates.length : allEstimates.filter((e) => e.status === tab.value).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <PageShell
      title="Estimates"
      description={allEstimates.length > 0 ? `${allEstimates.length} estimate${allEstimates.length !== 1 ? "s" : ""}` : undefined}
      action={
        <Button size="sm" asChild>
          <Link href="/operations/estimates/new">+ New Estimate</Link>
        </Button>
      }
    >
      <div className="flex gap-1 border-b border-[#e5e7eb] mb-6 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/operations/estimates${tab.value !== "all" ? `?status=${tab.value}` : ""}`}
            className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              status === tab.value
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

      {estimates.length === 0 ? (
        <EmptyState
          title={status === "all" ? "No estimates yet" : `No ${status} estimates`}
          description={
            status === "all"
              ? "Create your first estimate to send to a customer."
              : "Estimates with this status will appear here."
          }
          actionLabel={status === "all" ? "New Estimate" : undefined}
          actionHref={status === "all" ? "/operations/estimates/new" : undefined}
        />
      ) : (
        <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#f3f4f6] bg-[#f9fafb]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Estimate</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wide hidden sm:table-cell">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wide hidden md:table-cell">Valid Until</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#6b7280] uppercase tracking-wide hidden lg:table-cell">Total</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wide hidden lg:table-cell">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3f4f6]">
              {estimates.map((est) => (
                <tr key={est.id} className="hover:bg-[#f9fafb] transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/operations/estimates/${est.id}`} className="font-medium text-[#0a0a0a] hover:underline">
                      {est.estimateNumber}
                    </Link>
                    <p className="text-xs text-[#9ca3af] mt-0.5">{est.title}</p>
                  </td>
                  <td className="px-4 py-3 text-[#6b7280] hidden sm:table-cell">
                    <Link href={`/operations/customers/${est.customer.id}`} className="hover:underline">
                      {est.customer.fullName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <EstimateStatusBadge status={est.status} />
                  </td>
                  <td className="px-4 py-3 text-[#6b7280] hidden md:table-cell">
                    {est.validUntil ? formatDate(est.validUntil) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-[#374151] hidden lg:table-cell">
                    {formatCurrency(Number(est.total))}
                  </td>
                  <td className="px-4 py-3 text-[#9ca3af] hidden lg:table-cell">{formatDate(est.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}
