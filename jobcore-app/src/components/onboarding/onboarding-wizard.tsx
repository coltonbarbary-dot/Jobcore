"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { completeOnboarding } from "@/app/onboarding/actions";
import { ChevronRight, ChevronLeft, CheckCircle2 } from "lucide-react";

const BUSINESS_TYPES = [
  "General Contractor",
  "Electrician",
  "Plumber",
  "HVAC",
  "Roofing",
  "Painting",
  "Landscaping",
  "Flooring",
  "Masonry",
  "Carpentry",
  "Other",
];

const STEPS = ["Business Info", "Contact & Location", "Review"];

interface Props {
  userId: string;
  orgId: string | null;
  orgName: string;
}

export function OnboardingWizard({ orgName }: Props) {
  const [step, setStep] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    businessName: orgName || "",
    businessType: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    zip: "",
  });

  const update = (field: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const canProceedStep0 = form.businessName.trim().length > 0 && form.businessType.length > 0;
  const canProceedStep1 = form.phone.trim().length > 0 && form.city.trim().length > 0;

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      try {
        await completeOnboarding(form);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  };

  return (
    <Card className="w-full max-w-lg shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-[#0a0a0a]">
            <span className="text-xs font-bold text-white">JC</span>
          </div>
          <span className="text-sm font-semibold text-[#0a0a0a]">JobCore</span>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold transition-colors ${
                  i < step
                    ? "bg-[#0a0a0a] text-white"
                    : i === step
                    ? "bg-[#0a0a0a] text-white"
                    : "bg-[#e5e7eb] text-[#9ca3af]"
                }`}
              >
                {i < step ? <CheckCircle2 className="h-3 w-3" /> : i + 1}
              </div>
              <span
                className={`text-xs ${
                  i === step ? "font-semibold text-[#0a0a0a]" : "text-[#9ca3af]"
                }`}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`h-px w-6 ${i < step ? "bg-[#0a0a0a]" : "bg-[#e5e7eb]"}`} />
              )}
            </div>
          ))}
        </div>

        <CardTitle className="text-lg">
          {step === 0 && "Tell us about your business"}
          {step === 1 && "Where are you located?"}
          {step === 2 && "Everything look good?"}
        </CardTitle>
        <CardDescription>
          {step === 0 && "This helps personalize your JobCore experience."}
          {step === 1 && "Your business address and phone number."}
          {step === 2 && "Review your details before we set up your account."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Step 0: Business Info */}
        {step === 0 && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="businessName">Business name</Label>
              <Input
                id="businessName"
                placeholder="ABC Contractors LLC"
                value={form.businessName}
                onChange={(e) => update("businessName", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Business type</Label>
              <div className="grid grid-cols-2 gap-2">
                {BUSINESS_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => update("businessType", type)}
                    className={`rounded-md border px-3 py-2 text-sm text-left transition-colors ${
                      form.businessType === type
                        ? "border-[#0a0a0a] bg-[#0a0a0a] text-white"
                        : "border-[#e5e7eb] text-[#374151] hover:border-[#0a0a0a]"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Step 1: Contact & Location */}
        {step === 1 && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(555) 000-0000"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="street">Street address</Label>
              <Input
                id="street"
                placeholder="123 Main St"
                value={form.street}
                onChange={(e) => update("street", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="Austin"
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  placeholder="TX"
                  maxLength={2}
                  value={form.state}
                  onChange={(e) => update("state", e.target.value.toUpperCase())}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="zip">ZIP code</Label>
              <Input
                id="zip"
                placeholder="78701"
                value={form.zip}
                onChange={(e) => update("zip", e.target.value)}
              />
            </div>
          </>
        )}

        {/* Step 2: Review */}
        {step === 2 && (
          <div className="space-y-3">
            <div className="rounded-lg border border-[#e5e7eb] p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#6b7280]">Business name</span>
                <span className="font-medium text-[#0a0a0a]">{form.businessName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#6b7280]">Business type</span>
                <span className="font-medium text-[#0a0a0a]">{form.businessType}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#6b7280]">Phone</span>
                <span className="font-medium text-[#0a0a0a]">{form.phone || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#6b7280]">Address</span>
                <span className="font-medium text-[#0a0a0a] text-right">
                  {[form.street, form.city, form.state, form.zip].filter(Boolean).join(", ") || "—"}
                </span>
              </div>
            </div>
            {error && (
              <p className="text-sm text-[#dc2626]">{error}</p>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep(step - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < 2 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={step === 0 ? !canProceedStep0 : !canProceedStep1}
            >
              Continue
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Setting up…" : "Launch JobCore"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
