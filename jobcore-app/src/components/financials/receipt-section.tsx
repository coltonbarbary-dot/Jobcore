"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { File as PrismaFile } from "@prisma/client";
import { deleteReceiptAction, linkReceiptAction } from "@/app/(app)/financials/expenses/actions";

function formatBytes(bytes: bigint | number | null | undefined): string {
  if (bytes == null) return "";
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

interface ReceiptSectionProps {
  expenseId: string;
  receiptFile: PrismaFile | null;
}

export function ReceiptSection({ expenseId, receiptFile }: ReceiptSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, startUpload] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renamePending, startRename] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleFileSelect(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    setError(null);

    startUpload(async () => {
      const form = new FormData();
      form.append("file", file);
      form.append("entityType", "expense");
      form.append("entityId", expenseId);

      const res = await fetch("/api/files/upload", { method: "POST", body: form });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Upload failed");
        return;
      }

      await linkReceiptAction(expenseId, body.id);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!receiptFile) return;
    startDelete(async () => {
      await deleteReceiptAction(expenseId, receiptFile.id);
      router.refresh();
    });
  }

  function startRenaming() {
    if (!receiptFile) return;
    setRenameValue(receiptFile.fileName);
    setRenaming(true);
  }

  function handleRename() {
    if (!receiptFile || !renameValue.trim()) return;
    startRename(async () => {
      const res = await fetch(`/api/files/${receiptFile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: renameValue.trim() }),
      });
      if (!res.ok) {
        setError("Rename failed");
        return;
      }
      setRenaming(false);
      router.refresh();
    });
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-[#0a0a0a] mb-3">Receipt</h3>

      {receiptFile ? (
        <div className="rounded-lg border border-[#e5e7eb] bg-white px-4 py-3">
          {renaming ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename();
                  if (e.key === "Escape") setRenaming(false);
                }}
                className="flex-1 text-sm border border-[#e5e7eb] rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#0a0a0a]"
              />
              <button
                onClick={handleRename}
                disabled={renamePending}
                className="text-xs px-2 py-1 bg-[#0a0a0a] text-white rounded hover:bg-[#1f2937] disabled:opacity-50"
              >
                {renamePending ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => setRenaming(false)}
                className="text-xs px-2 py-1 border border-[#e5e7eb] rounded text-[#6b7280] hover:text-[#0a0a0a]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded bg-[#f3f4f6] border border-[#e5e7eb] flex items-center justify-center shrink-0">
                <span className="text-[9px] font-bold text-[#6b7280] tracking-wide">
                  {receiptFile.mimeType === "application/pdf" ? "PDF" :
                   receiptFile.mimeType?.startsWith("image/") ? "IMG" : "FILE"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#0a0a0a] truncate">{receiptFile.fileName}</p>
                <p className="text-xs text-[#9ca3af]">{formatBytes(receiptFile.fileSizeBytes)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={`/api/files/${receiptFile.id}/download`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-1 text-xs text-[#6b7280] hover:text-[#0a0a0a] border border-[#e5e7eb] rounded hover:bg-[#f9fafb] transition-colors"
                >
                  Open
                </a>
                <button
                  onClick={startRenaming}
                  className="px-2 py-1 text-xs text-[#6b7280] hover:text-[#0a0a0a] border border-[#e5e7eb] rounded hover:bg-[#f9fafb] transition-colors"
                >
                  Rename
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-2 py-1 text-xs text-red-500 hover:text-red-700 border border-[#e5e7eb] rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept="image/*,application/pdf,.heic,.heif"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
          <div
            className="border-2 border-dashed border-[#e5e7eb] rounded-lg p-6 text-center hover:border-[#9ca3af] transition-colors cursor-pointer"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFileSelect(e.dataTransfer.files);
            }}
          >
            <p className="text-sm text-[#6b7280]">
              {uploading ? "Uploading…" : "Drop receipt here or click to upload"}
            </p>
            <p className="text-xs text-[#9ca3af] mt-1">JPG, PNG, PDF, HEIC — max 50 MB</p>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
