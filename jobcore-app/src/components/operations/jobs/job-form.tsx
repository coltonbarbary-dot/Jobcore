"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
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

const JOB_TYPES = [
  "Repair", "Installation", "Inspection", "Maintenance",
  "Renovation", "New Build", "Other",
];

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
  return d.toISOString().slice(0, 16);
}

export function JobForm({
  action,
  defaultValues,
  customers,
  defaultCustomerId,
  submitLabel = "Save Job",
}: JobFormProps) {
  const [state, formAction, isPending] = useActionState(action, {});

  const initialItems: JobItemDraft[] = (defaultValues?.items ?? []).map((item) => ({
    key: item.id,
    description: item.description,
    quantity: String(item.quantity),
    unitPrice: String(item.unitPrice),
  }));

  return (
    <form action={formAction} className="space-y-4 max-w-xl mx-auto">

      {state.error && (
        <div className="rounded-lg bg-[#fef2f2] border border-[#fecaca] px-4 py-3 text-sm text-[#dc2626]">
          {state.error}
        </div>
      )}

      {/* ── Basic info ── */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af]">Basic info</p>

          <div className="space-y-1.5">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              name="title"
              required
              defaultValue={defaultValues?.title}
              placeholder="e.g. Kitchen Renovation"
            />
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
        </CardContent>
      </Card>

      {/* ── Schedule ── */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af]">Schedule</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="scheduledStart">Start</Label>
              <Input
                id="scheduledStart"
                name="scheduledStart"
                type="datetime-local"
                defaultValue={toDatetimeLocal(defaultValues?.scheduledStart)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="scheduledEnd">End</Label>
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
            <Textarea
              id="description"
              name="description"
              defaultValue={defaultValues?.description ?? ""}
              placeholder="Job scope and details…"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Line items ── */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af]">Line items</p>
          <JobItemEditor initialItems={initialItems} />
        </CardContent>
      </Card>

      {/* ── Notes ── */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af]">Internal notes</p>
          <Textarea
            id="notes"
            name="notes"
            defaultValue={defaultValues?.notes ?? ""}
            placeholder="Notes only you and your team can see…"
            rows={3}
          />
        </CardContent>
      </Card>

      {/* ── Submit ── */}
      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? "Saving…" : submitLabel}
      </Button>

    </form>
  );
}
