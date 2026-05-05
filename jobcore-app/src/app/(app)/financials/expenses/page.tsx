import Link from "next/link";
import { requireOrg } from "@/lib/auth";
import { listExpenses, EXPENSE_CATEGORIES } from "@/lib/services/expenses";
import { PageShell } from "@/components/layout/page-shell";
import { formatCurrency } from "@/lib/utils";

const CATEGORY_COLORS: Record<string, string> = {
  Materials:      "bg-[#dbeafe] text-[#1e40af]",
  Labor:          "bg-[#dcfce7] text-[#15803d]",
  Equipment:      "bg-[#f3e8ff] text-[#7e22ce]",
  Fuel:           "bg-[#ffedd5] text-[#c2410c]",
  Travel:         "bg-[#fef9c3] text-[#854d0e]",
  "Office Supplies": "bg-[#f0fdf4] text-[#166534]",
  Software:       "bg-[#eff6ff] text-[#1d4ed8]",
  Marketing:      "bg-[#fce7f3] text-[#9d174d]",
  Subcontractor:  "bg-[#fff7ed] text-[#9a3412]",
  Other:          "bg-[#f3f4f6] text-[#374151]",
};

function categoryChip(category: string) {
  const cls = CATEGORY_COLORS[category] ?? "bg-[#f3f4f6] text-[#374151]";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold shrink-0 ${cls}`}>
      {category}
    </span>
  );
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; from?: string; to?: string }>;
}) {
  const { category, from: fromStr, to: toStr } = await searchParams;
  const { org } = await requireOrg();

  const from = fromStr ? new Date(fromStr) : undefined;
  const to = toStr ? new Date(toStr + "T23:59:59Z") : undefined;

  const expenses = await listExpenses(org.id, {
    category: category || undefined,
    from,
    to,
  });

  const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const hasFilters = !!(category || fromStr || toStr);

  const filterBar = (
    <form method="GET" className="flex flex-wrap items-center gap-2 mb-6">
      <select
        name="category"
        defaultValue={category ?? ""}
        className="text-sm rounded-lg border border-[#e5e7eb] px-3 py-1.5 text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#0a0a0a]"
      >
        <option value="">All categories</option>
        {EXPENSE_CATEGORIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <input
        type="date"
        name="from"
        defaultValue={fromStr ?? ""}
        className="text-sm rounded-lg border border-[#e5e7eb] px-3 py-1.5 text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#0a0a0a]"
      />
      <span className="text-xs text-[#9ca3af]">to</span>
      <input
        type="date"
        name="to"
        defaultValue={toStr ?? ""}
        className="text-sm rounded-lg border border-[#e5e7eb] px-3 py-1.5 text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#0a0a0a]"
      />

      <button
        type="submit"
        className="text-sm px-3 py-1.5 bg-[#0a0a0a] text-white rounded-lg hover:bg-[#1f2937] transition-colors"
      >
        Filter
      </button>
      {hasFilters && (
        <Link
          href="/financials/expenses"
          className="text-sm text-[#6b7280] hover:text-[#0a0a0a] underline"
        >
          Clear
        </Link>
      )}
    </form>
  );

  return (
    <PageShell
      title="Expenses"
      description={
        <span className="text-sm text-[#6b7280]">
          {expenses.length} expense{expenses.length !== 1 ? "s" : ""}
          {expenses.length > 0 && ` · ${formatCurrency(totalAmount)} total`}
        </span>
      }
      action={
        <Link
          href="/financials/expenses/new"
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium bg-[#0a0a0a] text-white rounded-lg hover:bg-[#1f2937] transition-colors"
        >
          + New Expense
        </Link>
      }
    >
      {filterBar}

      {expenses.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-[#9ca3af]">
            {hasFilters ? "No expenses match the current filters." : "No expenses recorded yet."}
          </p>
          {!hasFilters && (
            <Link
              href="/financials/expenses/new"
              className="text-sm text-[#2563eb] hover:underline mt-2 inline-block"
            >
              Record an expense →
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e5e7eb]">
                <th className="text-left py-2 pr-4 text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Date</th>
                <th className="text-left py-2 pr-4 text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Vendor</th>
                <th className="text-left py-2 pr-4 text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Category</th>
                <th className="text-left py-2 pr-4 text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Job</th>
                <th className="text-right py-2 text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Amount</th>
                <th className="text-right py-2 pl-4 text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3f4f6]">
              {expenses.map((expense) => {
                const dateStr = new Date(expense.date).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
                });
                return (
                  <tr key={expense.id} className="hover:bg-[#f9fafb] transition-colors group">
                    <td className="py-3 pr-4 text-[#6b7280] whitespace-nowrap">{dateStr}</td>
                    <td className="py-3 pr-4 max-w-[160px]">
                      <Link
                        href={`/financials/expenses/${expense.id}`}
                        className="text-[#0a0a0a] font-medium group-hover:underline truncate block"
                      >
                        {expense.vendor || <span className="text-[#9ca3af] font-normal italic">No vendor</span>}
                      </Link>
                      {expense.description && (
                        <p className="text-xs text-[#9ca3af] truncate">{expense.description}</p>
                      )}
                    </td>
                    <td className="py-3 pr-4">{categoryChip(expense.category)}</td>
                    <td className="py-3 pr-4 text-[#6b7280] text-xs">
                      {expense.job ? (
                        <Link href={`/operations/jobs/${expense.job.id}`} className="hover:underline truncate block max-w-[120px]">
                          {expense.job.title}
                        </Link>
                      ) : (
                        <span className="text-[#d1d5db]">—</span>
                      )}
                    </td>
                    <td className="py-3 text-right font-semibold tabular-nums text-[#0a0a0a]">
                      {formatCurrency(Number(expense.amount))}
                    </td>
                    <td className="py-3 pl-4 text-right">
                      {expense.receiptFile ? (
                        <a
                          href={`/api/files/${expense.receiptFile.id}/download`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-[#2563eb] hover:underline"
                        >
                          View
                        </a>
                      ) : (
                        <span className="text-xs text-[#d1d5db]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#e5e7eb]">
                <td colSpan={4} className="py-3 text-xs font-semibold text-[#6b7280] uppercase tracking-wide">
                  Total{hasFilters ? " (filtered)" : ""}
                </td>
                <td className="py-3 text-right font-bold text-[#0a0a0a] tabular-nums">
                  {formatCurrency(totalAmount)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </PageShell>
  );
}
