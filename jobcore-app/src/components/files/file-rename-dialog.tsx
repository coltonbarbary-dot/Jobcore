"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface FileRenameDialogProps {
  fileId: string;
  currentName: string;
  open: boolean;
  onClose: () => void;
}

export function FileRenameDialog({ fileId, currentName, open, onClose }: FileRenameDialogProps) {
  const [name, setName] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSave() {
    if (!name.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/files/${fileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: name.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Rename failed");
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Rename file</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            autoFocus
          />
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={isPending || !name.trim()}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
