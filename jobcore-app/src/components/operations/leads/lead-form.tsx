"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import type { Lead, Customer } from "@prisma/client";

const LEAD_STATUSES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
];

const LEAD_SOURCES = [
  "Referral", "Website", "Cold Call", "Social Media", "Google", "Door Hanger", "Yard Sign", "Other",
];

interface LeadFormProps {
  action: (prevState: { error?: string }, formData: FormData) => Promise<{ error?: string }>;
  defaultValues?: Partial<Lead>;
  customers: Pick<Customer, "id" | "fullName">[];
  submitLabel?: string;
}

export function LeadForm({ action, defaultValues, customers, submitLabel = "Save Lead" }: LeadFormProps) {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-5 max-w-lg">
      {state.error && (
        <div className="rounded-md bg-[#fef2f2] border border-[#fecaca] px-4 py-3 text-sm text-[#dc2626]">
          {state.error}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="title">Title *</Label>
        <Input id="title" name="title" required defaultValue={defaultValues?.title} placeholder="Kitchen Renovation Lead" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <Select id="status" name="status" defaultValue={defaultValues?.status ?? "new"}>
            {LEAD_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="source">Source</Label>
          <Select id="source" name="source" defaultValue={defaultValues?.source ?? ""}>
            <option value="">— Select source —</option>
            {LEAD_SOURCES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </div>
      </div>

      {customers.length > 0 && (
        <div className="space-y-1.5">
          <Label htmlFor="customerId">Link to existing customer</Label>
          <Select id="customerId" name="customerId" defaultValue={defaultValues?.customerId ?? ""}>
            <option value="">— None —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.fullName}</option>
            ))}
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="budgetEstimate">Budget estimate ($)</Label>
        <Input
          id="budgetEstimate"
          name="budgetEstimate"
          type="number"
          step="0.01"
          min="0"
          defaultValue={defaultValues?.budgetEstimate !== null && defaultValues?.budgetEstimate !== undefined
            ? Number(defaultValues.budgetEstimate).toString()
            : ""}
          placeholder="0.00"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" defaultValue={defaultValues?.description ?? ""} placeholder="What is this lead about?" rows={3} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" defaultValue={defaultValues?.notes ?? ""} placeholder="Internal notes…" rows={3} />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
