import Link from "next/link";
import { requireOrg } from "@/lib/auth";
import { listLeads } from "@/lib/services/leads";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { LeadStatusBadge } from "@/components/operations/status-badge";
import { EmptyState } from "@/components/operations/empty-state";
import { formatDate, formatCurrency } from "@/lib/utils";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const { org } = await requireOrg();
  const allLeads = await listLeads(org.id);

  const filtered = status ? allLeads.filter((l) => l.status === status) : allLeads;

  const STATUS_TABS = [
    { value: "", label: "All", count: allLeads.length },
    { value: "new", label: "New", count: allLeads.filter((l) => l.status === "new").length },
    { value: "contacted", label: "Contacted", count: allLeads.filter((l) => l.status === "contacted").length },
    { value: "qualified", label: "Qualified", count: allLeads.filter((l) => l.status === "qualified").length },
    { value: "converted", label: "Converted", count: allLeads.filter((l) => l.status === "converted").length },
    { value: "lost", label: "Lost", count: allLeads.filter((l) => l.status === "lost").length },
  ];

  return (
    <PageShell
      title="Leads"
      description={`${allLeads.length} lead${allLeads.length !== 1 ? "s" : ""}`}
      action={
        <Button size="sm" asChild>
          <Link href="/operations/leads/new">+ New Lead</Link>
        </Button>
      }
    >
      {/* Status filter tabs */}
      <div className="flex gap-1 overflow-x-auto mb-4 border-b border-[#e5e7eb]">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value ? `/operations/leads?status=${tab.value}` : "/operations/leads"}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              (status ?? "") === tab.value
                ? "border-[#0a0a0a] text-[#0a0a0a]"
                : "border-transparent text-[#6b7280] hover:text-[#0a0a0a]"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="text-xs bg-[#f3f4f6] text-[#6b7280] rounded-full px-1.5">{tab.count}</span>
            )}
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No leads found"
          description={status ? `No ${status} leads.` : "Add your first lead to start the pipeline."}
          actionLabel="New Lead"
          actionHref="/operations/leads/new"
        />
      ) : (
        <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#f3f4f6] bg-[#f9fafb]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wide hidden md:table-cell">Source</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#6b7280] uppercase tracking-wide hidden md:table-cell">Budget</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wide hidden lg:table-cell">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3f4f6]">
              {filtered.map((lead) => (
                <tr key={lead.id} className="hover:bg-[#f9fafb] transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/operations/leads/${lead.id}`} className="font-medium text-[#0a0a0a] hover:underline">
                      {lead.title}
                    </Link>
                    {lead.linkedCustomer && (
                      <p className="text-xs text-[#9ca3af] mt-0.5">{lead.linkedCustomer.fullName}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <LeadStatusBadge status={lead.status} />
                  </td>
                  <td className="px-4 py-3 text-[#6b7280] hidden md:table-cell">{lead.source ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-[#6b7280] hidden md:table-cell">
                    {lead.budgetEstimate ? formatCurrency(Number(lead.budgetEstimate)) : "—"}
                  </td>
                  <td className="px-4 py-3 text-[#9ca3af] hidden lg:table-cell">{formatDate(lead.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}
