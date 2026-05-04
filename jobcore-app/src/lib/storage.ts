import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getClient(): S3Client {
  const endpoint = process.env.STORAGE_ENDPOINT;
  const region = process.env.STORAGE_REGION ?? "auto";
  const accessKeyId = process.env.STORAGE_ACCESS_KEY ?? "";
  const secretAccessKey = process.env.STORAGE_SECRET_KEY ?? "";

  return new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: !!endpoint, // required for R2/MinIO/Supabase S3
  });
}

function getBucket(): string {
  const bucket = process.env.STORAGE_BUCKET;
  if (!bucket) throw new Error("STORAGE_BUCKET env var is not set");
  return bucket;
}

export function buildStorageKey(
  orgId: string,
  entityType: string,
  fileId: string,
  ext: string
): string {
  const safeExt = ext.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return `${orgId}/${entityType}/${fileId}${safeExt ? "." + safeExt : ""}`;
}

export async function uploadToStorage(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  const client = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

export async function getSignedDownloadUrl(
  key: string,
  expiresIn = 900
): Promise<string> {
  const client = getClient();
  const command = new GetObjectCommand({ Bucket: getBucket(), Key: key });
  return getSignedUrl(client, command, { expiresIn });
}

export async function deleteFromStorage(key: string): Promise<void> {
  const client = getClient();
  await client.send(
    new DeleteObjectCommand({ Bucket: getBucket(), Key: key })
  );
}
