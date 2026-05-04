"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { sendInvoiceAction } from "@/app/(app)/operations/invoices/actions";

interface SendInvoiceButtonProps {
  invoiceId: string;
  customerEmail: string | null;
}

export function SendInvoiceButton({ invoiceId, customerEmail }: SendInvoiceButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSend = () => {
    setError(null);
    startTransition(async () => {
      const result = await sendInvoiceAction(invoiceId);
      if (result?.error) {
        setError(result.error);
      } else {
        setSent(true);
        router.refresh();
      }
    });
  };

  if (sent) {
    return <span className="text-sm text-[#16a34a] font-medium">Sent ✓</span>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" onClick={handleSend} disabled={isPending || !customerEmail}>
        {isPending ? "Sending…" : "Send to Customer"}
      </Button>
      {!customerEmail && (
        <p className="text-xs text-[#9ca3af]">Add customer email first</p>
      )}
      {error && <p className="text-xs text-[#dc2626] max-w-xs text-right">{error}</p>}
    </div>
  );
}
