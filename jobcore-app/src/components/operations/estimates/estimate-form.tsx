"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { JobItemEditor, type JobItemDraft } from "@/components/operations/jobs/job-item-editor";
import type { Customer, Estimate, EstimateItem } from "@prisma/client";

interface EstimateFormProps {
  action: (prevState: { error?: string }, formData: FormData) => Promise<{ error?: string }>;
  defaultValues?: Partial<Estimate> & { items?: EstimateItem[] };
  customers: Pick<Customer, "id" | "fullName">[];
  defaultCustomerId?: string;
  submitLabel?: string;
}

function toDateInput(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function taxRateToPercent(rate: any): string {
  if (rate == null) return "";
  const n = Number(rate);
  if (isNaN(n) || n === 0) return "";
  // rate is stored as decimal fraction e.g. 0.085 → display as "8.5"
  return String(Math.round(n * 10000) / 100);
}

export function EstimateForm({
  action,
  defaultValues,
  customers,
  defaultCustomerId,
  submitLabel = "Save Estimate",
}: EstimateFormProps) {
  const [state, formAction, isPending] = useActionState(action, {});

  const initialItems: JobItemDraft[] = (defaultValues?.items ?? []).map((item) => ({
    key: item.id,
    description: item.description,
    quantity: String(item.quantity),
    unitPrice: String(item.unitPrice),
  }));

  return (
    <form action={formAction} className="space-y-5 max-w-xl">
      {state.error && (
        <div className="rounded-md bg-[#fef2f2] border border-[#fecaca] px-4 py-3 text-sm text-[#dc2626]">
          {state.error}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="title">Title *</Label>
        <Input id="title" name="title" required defaultValue={defaultValues?.title} placeholder="Bathroom Remodel" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="customerId">Customer *</Label>
        <Select
          id="customerId"
          name="customerId"
          required
          defaultValue={defaultValues?.customerId ?? defaultCustomerId ?? ""}
        >
          <option value="">— Select customer —</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.fullName}</option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="validUntil">Valid Until</Label>
          <Input
            id="validUntil"
            name="validUntil"
            type="date"
            defaultValue={toDateInput(defaultValues?.validUntil)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="taxRatePercent">Tax Rate (%)</Label>
          <Input
            id="taxRatePercent"
            name="taxRatePercent"
            type="number"
            min="0"
            max="100"
            step="0.001"
            defaultValue={taxRateToPercent(defaultValues?.taxRate)}
            placeholder="0"
          />
        </div>
      </div>

      {/* Line items */}
      <fieldset className="space-y-3 rounded-md border border-[#e5e7eb] p-4">
        <legend className="px-1 text-xs font-medium text-[#6b7280]">Line Items</legend>
        <JobItemEditor initialItems={initialItems} name="items" />
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" defaultValue={defaultValues?.notes ?? ""} placeholder="Scope, inclusions, exclusions…" rows={3} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="terms">Terms &amp; Conditions</Label>
        <Textarea id="terms" name="terms" defaultValue={defaultValues?.terms ?? ""} placeholder="Payment terms, warranty, etc." rows={3} />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
