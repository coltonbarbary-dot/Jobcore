"use client";

import { useState, useTransition } from "react";
import { approveEstimateAction, declineEstimateAction } from "./actions";

interface ApprovalButtonsProps {
  token: string;
}

export function ApprovalButtons({ token }: ApprovalButtonsProps) {
  const [status, setStatus] = useState<"idle" | "approved" | "declined">("idle");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleApprove = () => {
    setError(null);
    startTransition(async () => {
      const result = await approveEstimateAction(token);
      if (result.error) {
        setError(result.error);
      } else {
        setStatus("approved");
      }
    });
  };

  const handleDecline = () => {
    setError(null);
    startTransition(async () => {
      const result = await declineEstimateAction(token);
      if (result.error) {
        setError(result.error);
      } else {
        setStatus("declined");
      }
    });
  };

  if (status === "approved") {
    return (
      <div className="rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] px-6 py-5 text-center">
        <div className="text-2xl mb-2">✓</div>
        <p className="text-[#16a34a] font-semibold text-lg">Estimate Approved</p>
        <p className="text-[#4b5563] text-sm mt-1">Thank you! We&apos;ll be in touch to schedule your project.</p>
      </div>
    );
  }

  if (status === "declined") {
    return (
      <div className="rounded-xl bg-[#fef2f2] border border-[#fecaca] px-6 py-5 text-center">
        <p className="text-[#dc2626] font-semibold text-lg">Estimate Declined</p>
        <p className="text-[#4b5563] text-sm mt-1">Thank you for letting us know. Feel free to reach out if you change your mind.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-md bg-[#fef2f2] border border-[#fecaca] px-4 py-3 text-sm text-[#dc2626]">
          {error}
        </div>
      )}
      <button
        onClick={handleApprove}
        disabled={isPending}
        className="w-full py-3.5 px-6 bg-[#0a0a0a] text-white font-semibold rounded-xl text-base hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
      >
        {isPending ? "Processing…" : "Approve Estimate"}
      </button>
      <button
        onClick={handleDecline}
        disabled={isPending}
        className="w-full py-2.5 px-6 bg-transparent text-[#6b7280] font-medium rounded-xl text-sm border border-[#e5e7eb] hover:bg-[#f9fafb] transition-colors disabled:opacity-50"
      >
        Decline
      </button>
    </div>
  );
}
