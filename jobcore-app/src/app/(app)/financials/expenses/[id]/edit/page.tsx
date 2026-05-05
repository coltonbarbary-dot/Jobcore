import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/auth";
import { getExpense } from "@/lib/services/expenses";
import { listJobs } from "@/lib/services/jobs";
import { PageShell } from "@/components/layout/page-shell";
import { ExpenseForm } from "@/components/financials/expense-form";
import { updateExpenseAction } from "../../actions";

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { org } = await requireOrg();

  const [expense, jobs] = await Promise.all([
    getExpense(org.id, id),
    listJobs(org.id),
  ]);
  if (!expense) notFound();

  const dateStr = new Date(expense.date).toISOString().slice(0, 10);

  return (
    <PageShell
      title="Edit Expense"
      action={
        <Link
          href={`/financials/expenses/${id}`}
          className="px-3 py-1.5 text-sm border border-[#e5e7eb] rounded-lg text-[#6b7280] hover:text-[#0a0a0a] transition-colors"
        >
          Cancel
        </Link>
      }
    >
      <ExpenseForm
        action={updateExpenseAction}
        expenseId={id}
        defaultValues={{
          vendor: expense.vendor ?? undefined,
          amount: Number(expense.amount),
          category: expense.category,
          date: dateStr,
          description: expense.description ?? undefined,
          jobId: expense.jobId ?? undefined,
        }}
        jobs={jobs.map((j) => ({ id: j.id, title: j.title }))}
        cancelHref={`/financials/expenses/${id}`}
        submitLabel="Save Changes"
      />
    </PageShell>
  );
}
