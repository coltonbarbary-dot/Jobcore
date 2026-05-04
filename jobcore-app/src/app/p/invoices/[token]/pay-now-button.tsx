"use client";

import { useState, useTransition } from "react";
import { createPaymentSessionAction } from "./actions";

interface PayNowButtonProps {
  token: string;
}

export function PayNowButton({ token }: PayNowButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handlePay = () => {
    setError(null);
    startTransition(async () => {
      const result = await createPaymentSessionAction(token);
      if (result.error) {
        setError(result.error);
      } else if (result.url) {
        window.location.href = result.url;
      }
    });
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handlePay}
        disabled={isPending}
        className="w-full bg-[#0a0a0a] text-white font-semibold py-3.5 px-6 rounded-lg text-base disabled:opacity-60 hover:bg-[#1a1a1a] transition-colors"
      >
        {isPending ? "Redirecting to payment…" : "Pay Now →"}
      </button>
      {error && (
        <p className="text-sm text-[#dc2626] text-center">{error}</p>
      )}
    </div>
  );
}
