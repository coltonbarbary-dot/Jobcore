"use client";

import { EXPENSE_CATEGORIES } from "@/lib/services/expenses";

interface ExpenseFormProps {
  action: (formData: FormData) => Promise<void>;
  expenseId?: string;
  defaultValues?: {
    vendor?: string;
    amount?: number;
    category?: string;
    date?: string;
    description?: string;
    jobId?: string;
  };
  jobs?: { id: string; title: string }[];
  submitLabel?: string;
  cancelHref: string;
}

export function ExpenseForm({
  action,
  expenseId,
  defaultValues = {},
  jobs = [],
  submitLabel = "Save Expense",
  cancelHref,
}: ExpenseFormProps) {
  return (
    <form action={action} className="max-w-lg space-y-5">
      {expenseId && <input type="hidden" name="expenseId" value={expenseId} />}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-sm font-medium text-[#374151] mb-1.5">
            Amount <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6b7280]">$</span>
            <input
              type="number"
              name="amount"
              step="0.01"
              min="0"
              required
              defaultValue={defaultValues.amount ?? ""}
              placeholder="0.00"
              className="w-full rounded-lg border border-[#e5e7eb] bg-white pl-7 pr-3 py-2.5 text-sm text-[#0a0a0a] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#0a0a0a] focus:border-transparent"
            />
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1">
          <label className="block text-sm font-medium text-[#374151] mb-1.5">
            Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="date"
            required
            defaultValue={defaultValues.date ?? new Date().toISOString().slice(0, 10)}
            className="w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#0a0a0a] focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#374151] mb-1.5">
          Category <span className="text-red-500">*</span>
        </label>
        <select
          name="category"
          required
          defaultValue={defaultValues.category ?? ""}
          className="w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#0a0a0a] focus:border-transparent"
        >
          <option value="" disabled>Select category…</option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#374151] mb-1.5">Vendor</label>
        <input
          type="text"
          name="vendor"
          defaultValue={defaultValues.vendor ?? ""}
          placeholder="e.g. Home Depot"
          className="w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm text-[#0a0a0a] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#0a0a0a] focus:border-transparent"
        />
      </div>

      {jobs.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-[#374151] mb-1.5">
            Link to Job <span className="text-xs text-[#9ca3af] font-normal">(optional)</span>
          </label>
          <select
            name="jobId"
            defaultValue={defaultValues.jobId ?? ""}
            className="w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#0a0a0a] focus:border-transparent"
          >
            <option value="">— No job —</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-[#374151] mb-1.5">Description</label>
        <textarea
          name="description"
          rows={3}
          defaultValue={defaultValues.description ?? ""}
          placeholder="Notes about this expense…"
          className="w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm text-[#0a0a0a] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#0a0a0a] focus:border-transparent resize-none"
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium bg-[#0a0a0a] text-white rounded-lg hover:bg-[#1f2937] transition-colors"
        >
          {submitLabel}
        </button>
        <a
          href={cancelHref}
          className="px-4 py-2 text-sm font-medium text-[#6b7280] border border-[#e5e7eb] rounded-lg hover:text-[#0a0a0a] transition-colors"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
