"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
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
    <form action={action} className="space-y-4 max-w-xl mx-auto">
      {expenseId && <input type="hidden" name="expenseId" value={expenseId} />}

      {/* ── Expense details ── */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af]">Expense details</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount ($) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#9ca3af] pointer-events-none">$</span>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  defaultValue={defaultValues.amount ?? ""}
                  placeholder="0.00"
                  className="pl-7"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                name="date"
                type="date"
                required
                defaultValue={defaultValues.date ?? new Date().toISOString().slice(0, 10)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category">Category *</Label>
            <Select
              id="category"
              name="category"
              required
              defaultValue={defaultValues.category ?? ""}
            >
              <option value="" disabled>Select category…</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vendor">Vendor</Label>
            <Input
              id="vendor"
              name="vendor"
              defaultValue={defaultValues.vendor ?? ""}
              placeholder="e.g. Home Depot"
            />
          </div>

          {jobs.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="jobId">Link to job <span className="text-[#9ca3af] font-normal">(optional)</span></Label>
              <Select id="jobId" name="jobId" defaultValue={defaultValues.jobId ?? ""}>
                <option value="">— No job —</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>{j.title}</option>
                ))}
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Description ── */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af]">Notes</p>
          <Textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={defaultValues.description ?? ""}
            placeholder="Notes about this expense…"
          />
        </CardContent>
      </Card>

      {/* ── Actions ── */}
      <div className="flex flex-col-reverse sm:flex-row gap-3">
        <Button variant="secondary" size="lg" className="w-full sm:w-auto" asChild>
          <a href={cancelHref}>Cancel</a>
        </Button>
        <Button type="submit" size="lg" className="w-full sm:flex-1">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
