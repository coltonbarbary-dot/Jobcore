"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
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
    <form action={formAction} className="space-y-4 max-w-xl mx-auto">
      {state.error && (
        <div className="rounded-lg bg-[#fef2f2] border border-[#fecaca] px-4 py-3 text-sm text-[#dc2626]">
          {state.error}
        </div>
      )}

      {/* ── Contact ── */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af]">Contact</p>

          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full name *</Label>
            <Input
              id="fullName"
              name="fullName"
              required
              defaultValue={defaultValues?.fullName}
              placeholder="Jane Smith"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={defaultValues?.email ?? ""}
                placeholder="jane@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={defaultValues?.phone ?? ""}
                placeholder="(555) 000-0000"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="companyName">Company name</Label>
            <Input
              id="companyName"
              name="companyName"
              defaultValue={defaultValues?.companyName ?? ""}
              placeholder="ABC Corp"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Billing Address ── */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af]">Billing address</p>

          <div className="space-y-1.5">
            <Label htmlFor="street">Street</Label>
            <Input
              id="street"
              name="street"
              defaultValue={address?.street ?? ""}
              placeholder="123 Main St"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                name="city"
                defaultValue={address?.city ?? ""}
                placeholder="Austin"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  name="state"
                  maxLength={2}
                  defaultValue={address?.state ?? ""}
                  placeholder="TX"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="zip">ZIP</Label>
                <Input
                  id="zip"
                  name="zip"
                  defaultValue={address?.zip ?? ""}
                  placeholder="78701"
                />
              </div>
            </div>
          </div>
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
            placeholder="Notes about this customer…"
            rows={3}
          />
        </CardContent>
      </Card>

      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
