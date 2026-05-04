"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { convertLeadAction } from "@/app/(app)/operations/leads/actions";
import type { Customer } from "@prisma/client";

interface LeadConvertDialogProps {
  leadId: string;
  leadTitle: string;
  existingCustomers: Pick<Customer, "id" | "fullName">[];
}

export function LeadConvertDialog({ leadId, leadTitle, existingCustomers }: LeadConvertDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [useExisting, setUseExisting] = useState(false);
  const [existingCustomerId, setExistingCustomerId] = useState("");
  const [customerFullName, setCustomerFullName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [createJobFlag, setCreateJobFlag] = useState(true);
  const [jobTitle, setJobTitle] = useState(leadTitle);
  const [scheduledStart, setScheduledStart] = useState("");

  const handleConvert = () => {
    setError(null);

    if (!useExisting && !customerFullName.trim()) {
      setError("Customer name is required");
      return;
    }
    if (useExisting && !existingCustomerId) {
      setError("Please select a customer");
      return;
    }
    if (createJobFlag && !jobTitle.trim()) {
      setError("Job title is required");
      return;
    }

    startTransition(async () => {
      const result = await convertLeadAction(leadId, {
        createCustomer: !useExisting,
        customerFullName: useExisting ? undefined : customerFullName,
        customerEmail: useExisting ? undefined : customerEmail || undefined,
        customerPhone: useExisting ? undefined : customerPhone || undefined,
        existingCustomerId: useExisting ? existingCustomerId : undefined,
        createJob: createJobFlag,
        jobTitle: createJobFlag ? jobTitle : undefined,
        jobScheduledStart: createJobFlag && scheduledStart ? new Date(scheduledStart) : undefined,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setOpen(false);
      if (result.jobId) {
        router.push(`/operations/jobs/${result.jobId}`);
      } else if (result.customerId) {
        router.push(`/operations/customers/${result.customerId}`);
      } else {
        router.push("/operations/leads");
      }
      router.refresh();
    });
  };

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Convert Lead
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Convert Lead</DialogTitle>
            <DialogDescription>
              Create a customer and optionally a job from <strong>{leadTitle}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Customer section */}
            <div>
              <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-3">Customer</p>
              {existingCustomers.length > 0 && (
                <div className="flex gap-3 mb-3">
                  <button
                    type="button"
                    onClick={() => setUseExisting(false)}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${
                      !useExisting ? "border-[#0a0a0a] bg-[#0a0a0a] text-white" : "border-[#e5e7eb] text-[#374151]"
                    }`}
                  >
                    Create new
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseExisting(true)}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${
                      useExisting ? "border-[#0a0a0a] bg-[#0a0a0a] text-white" : "border-[#e5e7eb] text-[#374151]"
                    }`}
                  >
                    Use existing
                  </button>
                </div>
              )}

              {useExisting ? (
                <div className="space-y-1.5">
                  <Label>Select customer</Label>
                  <Select value={existingCustomerId} onChange={(e) => setExistingCustomerId(e.target.value)}>
                    <option value="">— Select —</option>
                    {existingCustomers.map((c) => (
                      <option key={c.id} value={c.id}>{c.fullName}</option>
                    ))}
                  </Select>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Full name *</Label>
                    <Input value={customerFullName} onChange={(e) => setCustomerFullName(e.target.value)} placeholder="Jane Smith" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Email</Label>
                      <Input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="jane@example.com" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Phone</Label>
                      <Input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="(555) 000-0000" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Job section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Job</p>
                <label className="ml-auto flex items-center gap-2 text-sm text-[#374151]">
                  <input
                    type="checkbox"
                    checked={createJobFlag}
                    onChange={(e) => setCreateJobFlag(e.target.checked)}
                    className="h-4 w-4 rounded border-[#d1d5db]"
                  />
                  Create a job
                </label>
              </div>

              {createJobFlag && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Job title *</Label>
                    <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Job title" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Scheduled start (optional)</Label>
                    <Input
                      type="datetime-local"
                      value={scheduledStart}
                      onChange={(e) => setScheduledStart(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {error && <p className="text-sm text-[#dc2626]">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleConvert} disabled={isPending}>
              {isPending ? "Converting…" : "Convert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
