import { listFiles } from "@/lib/services/files";
import { FileUploadSection } from "./file-upload-section";
import { FileList } from "./file-list";

interface FilesTabProps {
  organizationId: string;
  entityType: string;
  entityId: string;
  customerId?: string;
  jobId?: string;
}

export async function FilesTab({
  organizationId,
  entityType,
  entityId,
  customerId,
  jobId,
}: FilesTabProps) {
  const files = await listFiles(organizationId, entityType, entityId);

  return (
    <div className="max-w-2xl space-y-5">
      <FileUploadSection
        entityType={entityType}
        entityId={entityId}
        customerId={customerId}
        jobId={jobId}
      />
      <FileList files={files} />
    </div>
  );
}
