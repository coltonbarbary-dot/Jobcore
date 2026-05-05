import Link from "next/link";
import { requireOrg } from "@/lib/auth";
import { getReportSummary } from "@/lib/services/expenses";
import { PageShell } from "@/components/layout/page-shell";
import { formatCurrency } from "@/lib/utils";

function MetricCard({
  label,
  value,
  sub,
  highlight,
  positive,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  positive?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        highlight
          ? positive
            ? "border-[#bbf7d0] bg-[#f0fdf4]"
            : positive === false
            ? "border-[#fecaca] bg-[#fef2f2]"
            : "border-[#e5e7eb] bg-white"
          : "border-[#e5e7eb] bg-white"
      }`}
    >
      <p className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wide mb-1">{label}</p>
      <p
        className={`text-2xl font-bold tabular-nums ${
          highlight
            ? positive
              ? "text-[#15803d]"
              : positive === false
              ? "text-[#b91c1c]"
              : "text-[#0a0a0a]"
            : "text-[#0a0a0a]"
        }`}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-[#9ca3af] mt-1">{sub}</p>}
    </div>
  );
}

export default async function ReportsPage() {
  const { org } = await requireOrg();
  const report = await getReportSummary(org.id);

  const isProfit = report.estimatedNetProfit >= 0;

  return (
    <PageShell
      title="Reports"
      description={
        <span className="text-xs text-[#9ca3af]">All-time · live data from your records</span>
      }
    >
      <div className="max-w-3xl space-y-8">
        {/* KPI grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Total Revenue"
            value={formatCurrency(report.totalRevenue)}
            sub="From succeeded payments"
          />
          <MetricCard
            label="Total Expenses"
            value={formatCurrency(report.totalExpenses)}
            sub="All recorded expenses"
          />
          <MetricCard
            label="Outstanding"
            value={formatCurrency(report.outstandingInvoices)}
            sub="Unpaid invoice balances"
          />
          <MetricCard
            label="Est. Net Profit"
            value={formatCurrency(report.estimatedNetProfit)}
            sub="Revenue − expenses"
            highlight
            positive={isProfit}
          />
        </div>

        {/* Jobs metric */}
        <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-[#f3f4f6] flex items-center justify-center text-lg font-bold text-[#374151] shrink-0">
            {report.completedJobsCount}
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0a0a0a]">
              {report.completedJobsCount} completed job{report.completedJobsCount !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-[#9ca3af]">All time</p>
          </div>
        </div>

        {/* Expense breakdown */}
        {report.expensesByCategory.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-[#0a0a0a] mb-3">Expenses by Category</h2>
            <div className="rounded-xl border border-[#e5e7eb] bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e5e7eb] bg-[#f9fafb]">
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-[#6b7280] uppercase tracking-wide">
                      Category
                    </th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-[#6b7280] uppercase tracking-wide">
                      Total
                    </th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-[#6b7280] uppercase tracking-wide">
                      % of expenses
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f3f4f6]">
                  {report.expensesByCategory.map(({ category, total }) => {
                    const pct =
                      report.totalExpenses > 0
                        ? ((total / report.totalExpenses) * 100).toFixed(1)
                        : "0.0";
                    return (
                      <tr key={category}>
                        <td className="py-2.5 px-4 text-[#374151]">{category}</td>
                        <td className="py-2.5 px-4 text-right font-semibold tabular-nums text-[#0a0a0a]">
                          {formatCurrency(total)}
                        </td>
                        <td className="py-2.5 px-4 text-right text-[#9ca3af]">{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Data freshness note */}
        <p className="text-xs text-[#9ca3af]">
          Revenue reflects payments with status <span className="font-mono">succeeded</span>.
          Outstanding reflects invoices with status{" "}
          <span className="font-mono">sent / viewed / partial / overdue</span>.
          Net profit is an estimate (revenue − all expenses recorded in this system).{" "}
          <Link href="/financials/expenses" className="text-[#2563eb] hover:underline">
            View expenses →
          </Link>
        </p>
      </div>
    </PageShell>
  );
}
