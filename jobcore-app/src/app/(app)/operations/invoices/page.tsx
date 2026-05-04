import Link from "next/link";
import { requireOrg } from "@/lib/auth";
import { listInvoices } from "@/lib/services/invoices";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/operations/empty-state";
import { InvoiceStatusBadge } from "@/components/operations/status-badge";
import { formatDate, formatCurrency } from "@/lib/utils";

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "viewed", label: "Viewed" },
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "void", label: "Void" },
] as const;

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = "all" } = await searchParams;
  const { org } = await requireOrg();
  const allInvoices = await listInvoices(org.id);

  const invoices = status === "all" ? allInvoices : allInvoices.filter((i) => i.status === status);

  const counts = STATUS_TABS.reduce((acc, tab) => {
    acc[tab.value] = tab.value === "all" ? allInvoices.length : allInvoices.filter((i) => i.status === tab.value).length;
    return acc;
  }, {} as Record<string, number>);

  const now = new Date();

  return (
    <PageShell
      title="Invoices"
      description={allInvoices.length > 0 ? `${allInvoices.length} invoice${allInvoices.length !== 1 ? "s" : ""}` : undefined}
      action={
        <Button size="sm" asChild>
          <Link href="/operations/invoices/new">+ New Invoice</Link>
        </Button>
      }
    >
      <div className="flex gap-1 border-b border-[#e5e7eb] mb-6 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/operations/invoices${tab.value !== "all" ? `?status=${tab.value}` : ""}`}
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

      {invoices.length === 0 ? (
        <EmptyState
          title={status === "all" ? "No invoices yet" : `No ${status} invoices`}
          description={
            status === "all"
              ? "Create your first invoice to send to a customer."
              : "Invoices with this status will appear here."
          }
          actionLabel={status === "all" ? "New Invoice" : undefined}
          actionHref={status === "all" ? "/operations/invoices/new" : undefined}
        />
      ) : (
        <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#f3f4f6] bg-[#f9fafb]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Invoice</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wide hidden sm:table-cell">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wide hidden md:table-cell">Due Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#6b7280] uppercase tracking-wide hidden lg:table-cell">Amount Due</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#6b7280] uppercase tracking-wide hidden lg:table-cell">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3f4f6]">
              {invoices.map((inv) => {
                const isOverduePending =
                  !!inv.dueDate &&
                  inv.dueDate < now &&
                  inv.status !== "paid" &&
                  inv.status !== "void";
                return (
                  <tr key={inv.id} className="hover:bg-[#f9fafb] transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/operations/invoices/${inv.id}`} className="font-medium text-[#0a0a0a] hover:underline">
                        {inv.invoiceNumber}
                      </Link>
                      {inv.job && (
                        <p className="text-xs text-[#9ca3af] mt-0.5">{inv.job.title}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#6b7280] hidden sm:table-cell">
                      <Link href={`/operations/customers/${inv.customer.id}`} className="hover:underline">
                        {inv.customer.fullName}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <InvoiceStatusBadge status={inv.status} />
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {inv.dueDate ? (
                        <span className={isOverduePending ? "text-[#b45309] font-medium" : "text-[#6b7280]"}>
                          {formatDate(inv.dueDate)}{isOverduePending ? " ⚠" : ""}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-[#374151] font-medium hidden lg:table-cell">
                      {formatCurrency(Number(inv.amountDue))}
                    </td>
                    <td className="px-4 py-3 text-right text-[#9ca3af] hidden lg:table-cell">
                      {formatCurrency(Number(inv.total))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}
