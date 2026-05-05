import Link from "next/link";
import { requireOrg } from "@/lib/auth";
import { listJobs } from "@/lib/services/jobs";
import { PageShell } from "@/components/layout/page-shell";
import { ExpenseForm } from "@/components/financials/expense-form";
import { createExpenseAction } from "../actions";

export default async function NewExpensePage() {
  const { org } = await requireOrg();
  const jobs = await listJobs(org.id);

  return (
    <PageShell
      title="New Expense"
      action={
        <Link
          href="/financials/expenses"
          className="px-3 py-1.5 text-sm border border-[#e5e7eb] rounded-lg text-[#6b7280] hover:text-[#0a0a0a] transition-colors"
        >
          Cancel
        </Link>
      }
    >
      <ExpenseForm
        action={createExpenseAction}
        jobs={jobs.map((j) => ({ id: j.id, title: j.title }))}
        cancelHref="/financials/expenses"
        submitLabel="Create Expense"
      />
    </PageShell>
  );
}
