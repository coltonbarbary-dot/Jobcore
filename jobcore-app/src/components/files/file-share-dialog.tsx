"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface FileShareDialogProps {
  fileId: string;
  fileName: string;
  open: boolean;
  onClose: () => void;
}

export function FileShareDialog({ fileId, fileName, open, onClose }: FileShareDialogProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleGenerate(days: number) {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/files/${fileId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresInDays: days }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Failed to generate share link");
        return;
      }
      const body = await res.json();
      setShareUrl(body.shareUrl);
    });
  }

  function handleCopy() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleClose() {
    setShareUrl(null);
    setCopied(false);
    setError(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Share file</DialogTitle>
          <DialogDescription className="truncate text-sm">{fileName}</DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-3">
          {!shareUrl ? (
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => handleGenerate(7)} disabled={isPending}>
                7-day link
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handleGenerate(30)} disabled={isPending}>
                30-day link
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-[#6b7280] break-all bg-[#f9fafb] border border-[#e5e7eb] rounded p-2">
                {shareUrl}
              </p>
              <Button variant="secondary" size="sm" onClick={handleCopy}>
                {copied ? "Copied!" : "Copy link"}
              </Button>
            </div>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="secondary" size="sm" onClick={handleClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
