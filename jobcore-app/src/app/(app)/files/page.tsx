import Link from "next/link";
import { requireOrg } from "@/lib/auth";
import { listAllFiles } from "@/lib/services/files";
import { PageShell } from "@/components/layout/page-shell";
import { FileList } from "@/components/files/file-list";
import { type File as PrismaFile } from "@prisma/client";

function entityHref(file: PrismaFile): string {
  switch (file.entityType) {
    case "job":       return `/operations/jobs/${file.entityId}?tab=files`;
    case "customer":  return `/operations/customers/${file.entityId}?tab=files`;
    case "estimate":  return `/operations/estimates/${file.entityId}?tab=files`;
    case "invoice":   return `/operations/invoices/${file.entityId}?tab=files`;
    case "lead":      return `/operations/leads/${file.entityId}?tab=files`;
    default:          return "#";
  }
}

function entityLabel(file: PrismaFile): string {
  return file.entityType.charAt(0).toUpperCase() + file.entityType.slice(1);
}

export default async function FilesPage() {
  const { org } = await requireOrg();
  const files = await listAllFiles(org.id);

  return (
    <PageShell
      title="Files"
      description={
        <span className="text-sm text-[#6b7280]">
          {files.length} file{files.length !== 1 ? "s" : ""}
        </span>
      }
    >
      {files.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-[#9ca3af]">No files uploaded yet.</p>
          <p className="text-xs text-[#9ca3af] mt-1">
            Upload files from a{" "}
            <Link href="/operations/jobs" className="text-[#2563eb] hover:underline">job</Link>,{" "}
            <Link href="/operations/customers" className="text-[#2563eb] hover:underline">customer</Link>, or other record.
          </p>
        </div>
      ) : (
        <div className="space-y-6 max-w-3xl">
          {/* Group by entityType for readability */}
          {(["job", "customer", "estimate", "invoice", "lead"] as const)
            .map((et) => {
              const group = files.filter((f) => f.entityType === et);
              if (group.length === 0) return null;
              return (
                <section key={et}>
                  <h2 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-3">
                    {entityLabel(group[0])}s ({group.length})
                  </h2>
                  <div className="space-y-2">
                    {group.map((file) => (
                      <div key={file.id} className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <FileList files={[file]} />
                        </div>
                        <Link
                          href={entityHref(file)}
                          className="shrink-0 text-xs text-[#6b7280] hover:text-[#0a0a0a] underline mt-3"
                        >
                          View {file.entityType}
                        </Link>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })
            .filter(Boolean)}
        </div>
      )}
    </PageShell>
  );
}
