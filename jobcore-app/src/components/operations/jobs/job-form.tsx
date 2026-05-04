"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { JobItemEditor, type JobItemDraft } from "./job-item-editor";
import type { Customer, Job, JobItem } from "@prisma/client";

const JOB_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const JOB_PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const JOB_TYPES = ["Repair", "Installation", "Inspection", "Maintenance", "Renovation", "New Build", "Other"];

interface JobFormProps {
  action: (prevState: { error?: string }, formData: FormData) => Promise<{ error?: string }>;
  defaultValues?: Partial<Job> & { items?: JobItem[] };
  customers: Pick<Customer, "id" | "fullName">[];
  defaultCustomerId?: string;
  submitLabel?: string;
}

function toDatetimeLocal(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  // Format as YYYY-MM-DDTHH:mm
  return d.toISOString().slice(0, 16);
}

export function JobForm({ action, defaultValues, customers, defaultCustomerId, submitLabel = "Save Job" }: JobFormProps) {
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
        <Input id="title" name="title" required defaultValue={defaultValues?.title} placeholder="Kitchen Renovation" />
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
          <Label htmlFor="status">Status</Label>
          <Select id="status" name="status" defaultValue={defaultValues?.status ?? "draft"}>
            {JOB_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="priority">Priority</Label>
          <Select id="priority" name="priority" defaultValue={defaultValues?.priority ?? "normal"}>
            {JOB_PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="jobType">Job type</Label>
        <Select id="jobType" name="jobType" defaultValue={defaultValues?.jobType ?? ""}>
          <option value="">— Select type —</option>
          {JOB_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="scheduledStart">Scheduled start</Label>
          <Input
            id="scheduledStart"
            name="scheduledStart"
            type="datetime-local"
            defaultValue={toDatetimeLocal(defaultValues?.scheduledStart)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="scheduledEnd">Scheduled end</Label>
          <Input
            id="scheduledEnd"
            name="scheduledEnd"
            type="datetime-local"
            defaultValue={toDatetimeLocal(defaultValues?.scheduledEnd)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" defaultValue={defaultValues?.description ?? ""} placeholder="Job scope and details…" rows={3} />
      </div>

      {/* Line items */}
      <fieldset className="space-y-3 rounded-md border border-[#e5e7eb] p-4">
        <legend className="px-1 text-xs font-medium text-[#6b7280]">Line Items</legend>
        <JobItemEditor initialItems={initialItems} />
      </fieldset>

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
