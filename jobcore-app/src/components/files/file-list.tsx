"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { File as PrismaFile } from "@prisma/client";
import { FileRenameDialog } from "./file-rename-dialog";
import { FileShareDialog } from "./file-share-dialog";

function formatBytes(bytes: bigint | number | null | undefined): string {
  if (bytes == null) return "";
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ mimeType }: { mimeType: string | null }) {
  const t = mimeType ?? "";
  let label = "FILE";
  if (t.startsWith("image/")) label = "IMG";
  else if (t === "application/pdf") label = "PDF";
  else if (t.includes("word") || t.includes("document")) label = "DOC";
  else if (t.includes("sheet") || t.includes("excel") || t.includes("csv")) label = "XLS";

  return (
    <div className="h-9 w-9 rounded bg-[#f3f4f6] border border-[#e5e7eb] flex items-center justify-center shrink-0">
      <span className="text-[9px] font-bold text-[#6b7280] tracking-wide">{label}</span>
    </div>
  );
}

interface FileRowProps {
  file: PrismaFile;
  onRename: (file: PrismaFile) => void;
  onShare: (file: PrismaFile) => void;
  onDelete: (fileId: string) => void;
  deleting: boolean;
}

function FileRow({ file, onRename, onShare, onDelete, deleting }: FileRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#e5e7eb] px-4 py-3 bg-white group">
      <FileIcon mimeType={file.mimeType} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#0a0a0a] truncate">{file.fileName}</p>
        <p className="text-xs text-[#9ca3af]">
          {formatBytes(file.fileSizeBytes)}
          {file.mimeType && <span> · {file.mimeType.split("/")[1]?.toUpperCase()}</span>}
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <a
          href={`/api/files/${file.id}/download`}
          target="_blank"
          rel="noreferrer"
          className="px-2 py-1 text-xs text-[#6b7280] hover:text-[#0a0a0a] border border-[#e5e7eb] rounded hover:bg-[#f9fafb] transition-colors"
        >
          Open
        </a>
        <button
          onClick={() => onRename(file)}
          className="px-2 py-1 text-xs text-[#6b7280] hover:text-[#0a0a0a] border border-[#e5e7eb] rounded hover:bg-[#f9fafb] transition-colors"
        >
          Rename
        </button>
        <button
          onClick={() => onShare(file)}
          className="px-2 py-1 text-xs text-[#6b7280] hover:text-[#0a0a0a] border border-[#e5e7eb] rounded hover:bg-[#f9fafb] transition-colors"
        >
          Share
        </button>
        <button
          onClick={() => onDelete(file.id)}
          disabled={deleting}
          className="px-2 py-1 text-xs text-red-500 hover:text-red-700 border border-[#e5e7eb] rounded hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

interface FileListProps {
  files: PrismaFile[];
}

export function FileList({ files }: FileListProps) {
  const [renameTarget, setRenameTarget] = useState<PrismaFile | null>(null);
  const [shareTarget, setShareTarget] = useState<PrismaFile | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete(fileId: string) {
    if (!confirm("Delete this file? This cannot be undone.")) return;
    setDeletingId(fileId);
    startTransition(async () => {
      await fetch(`/api/files/${fileId}`, { method: "DELETE" });
      setDeletingId(null);
      router.refresh();
    });
  }

  if (files.length === 0) {
    return (
      <p className="text-sm text-[#9ca3af] py-2">No files attached yet.</p>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {files.map((file) => (
          <FileRow
            key={file.id}
            file={file}
            onRename={setRenameTarget}
            onShare={setShareTarget}
            onDelete={handleDelete}
            deleting={deletingId === file.id && isPending}
          />
        ))}
      </div>

      {renameTarget && (
        <FileRenameDialog
          fileId={renameTarget.id}
          currentName={renameTarget.fileName}
          open={true}
          onClose={() => setRenameTarget(null)}
        />
      )}

      {shareTarget && (
        <FileShareDialog
          fileId={shareTarget.id}
          fileName={shareTarget.fileName}
          open={true}
          onClose={() => setShareTarget(null)}
        />
      )}
    </>
  );
}
