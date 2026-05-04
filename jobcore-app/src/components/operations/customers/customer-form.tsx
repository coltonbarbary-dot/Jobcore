"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Customer } from "@prisma/client";

type Address = { street?: string; city?: string; state?: string; zip?: string } | null;

interface CustomerFormProps {
  action: (prevState: { error?: string }, formData: FormData) => Promise<{ error?: string }>;
  defaultValues?: Partial<Customer>;
  submitLabel?: string;
}

export function CustomerForm({ action, defaultValues, submitLabel = "Save Customer" }: CustomerFormProps) {
  const [state, formAction, isPending] = useActionState(action, {});
  const address = defaultValues?.billingAddress as Address;

  return (
    <form action={formAction} className="space-y-5 max-w-lg">
      {state.error && (
        <div className="rounded-md bg-[#fef2f2] border border-[#fecaca] px-4 py-3 text-sm text-[#dc2626]">
          {state.error}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="fullName">Full name *</Label>
        <Input id="fullName" name="fullName" required defaultValue={defaultValues?.fullName} placeholder="Jane Smith" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={defaultValues?.email ?? ""} placeholder="jane@example.com" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" defaultValue={defaultValues?.phone ?? ""} placeholder="(555) 000-0000" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="companyName">Company name</Label>
        <Input id="companyName" name="companyName" defaultValue={defaultValues?.companyName ?? ""} placeholder="ABC Corp" />
      </div>

      <fieldset className="space-y-3 rounded-md border border-[#e5e7eb] p-4">
        <legend className="px-1 text-xs font-medium text-[#6b7280]">Billing Address</legend>
        <div className="space-y-1.5">
          <Label htmlFor="street">Street</Label>
          <Input id="street" name="street" defaultValue={address?.street ?? ""} placeholder="123 Main St" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" defaultValue={address?.city ?? ""} placeholder="Austin" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="state">State</Label>
            <Input id="state" name="state" maxLength={2} defaultValue={address?.state ?? ""} placeholder="TX" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="zip">ZIP</Label>
          <Input id="zip" name="zip" defaultValue={address?.zip ?? ""} placeholder="78701" className="max-w-[120px]" />
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" defaultValue={defaultValues?.notes ?? ""} placeholder="Internal notes about this customer…" rows={3} />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
