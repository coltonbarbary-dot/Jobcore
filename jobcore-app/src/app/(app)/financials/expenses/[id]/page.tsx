import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/auth";
import { getExpense } from "@/lib/services/expenses";
import { PageShell } from "@/components/layout/page-shell";
import { ReceiptSection } from "@/components/financials/receipt-section";
import { deleteExpenseAction } from "../actions";
import { formatCurrency } from "@/lib/utils";

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { org } = await requireOrg();

  const expense = await getExpense(org.id, id);
  if (!expense) notFound();

  const dateStr = new Date(expense.date).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
  });

  return (
    <PageShell
      title={expense.vendor || "Expense"}
      description={
        <span className="text-sm text-[#6b7280]">{expense.category}</span>
      }
      action={
        <div className="flex items-center gap-2">
          <Link
            href={`/financials/expenses/${id}/edit`}
            className="px-3 py-1.5 text-sm border border-[#e5e7eb] rounded-lg text-[#6b7280] hover:text-[#0a0a0a] transition-colors"
          >
            Edit
          </Link>
          <Link
            href="/financials/expenses"
            className="px-3 py-1.5 text-sm border border-[#e5e7eb] rounded-lg text-[#6b7280] hover:text-[#0a0a0a] transition-colors"
          >
            ← Back
          </Link>
        </div>
      }
    >
      <div className="max-w-lg space-y-6">
        {/* Summary card */}
        <div className="rounded-xl border border-[#e5e7eb] bg-white overflow-hidden">
          <div className="px-5 py-4 bg-[#f9fafb] border-b border-[#e5e7eb]">
            <p className="text-2xl font-bold text-[#0a0a0a] tabular-nums">
              {formatCurrency(Number(expense.amount))}
            </p>
            <p className="text-sm text-[#6b7280] mt-0.5">{dateStr}</p>
          </div>

          <div className="px-5 py-4 space-y-3">
            <Row label="Category" value={expense.category} />
            {expense.vendor && <Row label="Vendor" value={expense.vendor} />}
            {expense.job && (
              <Row
                label="Job"
                value={
                  <Link href={`/operations/jobs/${expense.job.id}`} className="text-[#2563eb] hover:underline">
                    {expense.job.title}
                  </Link>
                }
              />
            )}
            {expense.description && <Row label="Notes" value={expense.description} />}
          </div>
        </div>

        {/* Receipt */}
        <ReceiptSection expenseId={id} receiptFile={expense.receiptFile} />

        {/* Danger zone */}
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-medium text-red-700 mb-2">Delete expense</p>
          <p className="text-xs text-red-500 mb-3">This action cannot be undone.</p>
          <form action={deleteExpenseAction}>
            <input type="hidden" name="expenseId" value={id} />
            <button
              type="submit"
              className="px-3 py-1.5 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete Expense
            </button>
          </form>
        </div>
      </div>
    </PageShell>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <span className="text-xs font-medium text-[#9ca3af] uppercase tracking-wide w-24 shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-sm text-[#0a0a0a] flex-1">{value}</span>
    </div>
  );
}
