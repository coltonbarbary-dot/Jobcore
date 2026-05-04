"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface FileUploadSectionProps {
  entityType: string;
  entityId: string;
  customerId?: string;
  jobId?: string;
}

export function FileUploadSection({ entityType, entityId, customerId, jobId }: FileUploadSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);

    startTransition(async () => {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        form.append("entityType", entityType);
        form.append("entityId", entityId);
        if (customerId) form.append("customerId", customerId);
        if (jobId) form.append("jobId", jobId);

        const res = await fetch("/api/files/upload", { method: "POST", body: form });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error ?? "Upload failed");
          return;
        }
      }
      router.refresh();
    });
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        accept="*/*"
      />

      <div
        className="border-2 border-dashed border-[#e5e7eb] rounded-lg p-6 text-center hover:border-[#9ca3af] transition-colors cursor-pointer"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
      >
        <p className="text-sm text-[#6b7280]">
          {isPending ? "Uploading…" : "Drop files here or click to upload"}
        </p>
        <p className="text-xs text-[#9ca3af] mt-1">Max 50 MB per file</p>
      </div>

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

      <div className="mt-3 flex justify-end">
        <Button
          variant="secondary"
          size="sm"
          disabled={isPending}
          onClick={() => inputRef.current?.click()}
        >
          {isPending ? "Uploading…" : "Upload file"}
        </Button>
      </div>
    </div>
  );
}
