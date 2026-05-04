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

interface ConfirmDeleteDialogProps {
  entityLabel: string;
  entityName: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void | { error?: string }>;
}

export function ConfirmDeleteDialog({ entityLabel, entityName, confirmLabel, onConfirm }: ConfirmDeleteDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    setError(null);
    startTransition(async () => {
      try {
        await onConfirm();
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Delete failed");
      }
    });
  };

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        {confirmLabel ?? "Delete"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmLabel ?? `Delete ${entityLabel}`}?</DialogTitle>
            <DialogDescription>
              <strong>{entityName}</strong>{" "}
              {confirmLabel ? "This action cannot be undone." : "will be permanently deleted. This cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-[#dc2626]">{error}</p>}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirm} disabled={isPending}>
              {isPending ? "Working…" : (confirmLabel ?? "Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
