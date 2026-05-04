"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { recordPaymentAction } from "@/app/(app)/operations/invoices/actions";

interface RecordPaymentDialogProps {
  invoiceId: string;
  amountDue: number;
}

export function RecordPaymentDialog({ invoiceId, amountDue }: RecordPaymentDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await recordPaymentAction(invoiceId, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setOpen(false);
        router.refresh();
      }
    });
  };

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Record Payment
      </Button>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-sm mx-4 p-6">
        <h2 className="text-base font-semibold text-[#0a0a0a] mb-4">Record Payment</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-[#dc2626]">{error}</p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="rp-amount">Amount ($) *</Label>
            <Input
              id="rp-amount"
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              defaultValue={amountDue > 0 ? String(amountDue) : ""}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rp-method">Method *</Label>
            <Select id="rp-method" name="method" required defaultValue="cash">
              <option value="cash">Cash</option>
              <option value="check">Check</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="stripe">Card (Stripe)</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rp-paidAt">Date *</Label>
            <Input
              id="rp-paidAt"
              name="paidAt"
              type="date"
              defaultValue={today}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rp-ref">Reference / Check #</Label>
            <Input id="rp-ref" name="referenceNumber" placeholder="Optional" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => { setOpen(false); setError(null); }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "Saving…" : "Record Payment"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
