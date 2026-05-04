import { db } from "@/lib/db";
import { type File as PrismaFile } from "@prisma/client";
import { logActivity } from "./activity";
import { randomBytes } from "crypto";

export type FileRecord = PrismaFile;

export type CreateFileData = {
  organizationId: string;
  uploadedBy: string;
  entityType: string;
  entityId: string;
  customerId?: string;
  jobId?: string;
  fileName: string;
  storageKey: string;
  mimeType?: string;
  fileSizeBytes?: bigint;
};

export async function listFiles(
  organizationId: string,
  entityType: string,
  entityId: string
): Promise<FileRecord[]> {
  return db.file.findMany({
    where: { organizationId, entityType, entityId, isDeleted: false },
    orderBy: { createdAt: "asc" },
  });
}

export async function listAllFiles(
  organizationId: string,
  { limit = 200, offset = 0 }: { limit?: number; offset?: number } = {}
): Promise<FileRecord[]> {
  return db.file.findMany({
    where: { organizationId, isDeleted: false },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 200),
    skip: offset,
  });
}

export async function getFile(
  organizationId: string,
  fileId: string
): Promise<FileRecord | null> {
  return db.file.findFirst({
    where: { id: fileId, organizationId, isDeleted: false },
  });
}

export async function getFileByToken(token: string): Promise<FileRecord | null> {
  return db.file.findFirst({
    where: { sharedToken: token, isDeleted: false },
  });
}

export async function createFile(data: CreateFileData): Promise<FileRecord> {
  const file = await db.file.create({
    data: {
      organizationId: data.organizationId,
      uploadedBy: data.uploadedBy,
      entityType: data.entityType,
      entityId: data.entityId,
      customerId: data.customerId ?? null,
      jobId: data.jobId ?? null,
      fileName: data.fileName,
      storageKey: data.storageKey,
      mimeType: data.mimeType ?? null,
      fileSizeBytes: data.fileSizeBytes ?? null,
    },
  });

  await logActivity({
    organizationId: data.organizationId,
    actorId: data.uploadedBy,
    action: "file.uploaded",
    entityType: data.entityType,
    entityId: data.entityId,
    metadata: { fileName: data.fileName, fileId: file.id },
  });

  return file;
}

export async function renameFile(
  organizationId: string,
  actorId: string,
  fileId: string,
  newName: string
): Promise<FileRecord> {
  const existing = await db.file.findFirst({
    where: { id: fileId, organizationId, isDeleted: false },
  });
  if (!existing) throw new Error("File not found");

  const file = await db.file.update({
    where: { id: fileId },
    data: { fileName: newName.trim() },
  });

  await logActivity({
    organizationId,
    actorId,
    action: "file.renamed",
    entityType: existing.entityType,
    entityId: existing.entityId,
    metadata: { from: existing.fileName, to: newName.trim() },
  });

  return file;
}

export async function generateShareToken(
  organizationId: string,
  actorId: string,
  fileId: string,
  expiresInDays = 7
): Promise<string> {
  const existing = await db.file.findFirst({
    where: { id: fileId, organizationId, isDeleted: false },
  });
  if (!existing) throw new Error("File not found");

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  await db.file.update({
    where: { id: fileId },
    data: { sharedToken: token, sharedExpiresAt: expiresAt },
  });

  await logActivity({
    organizationId,
    actorId,
    action: "file.shared",
    entityType: existing.entityType,
    entityId: existing.entityId,
    metadata: { fileId, expiresInDays },
  });

  return token;
}

export async function softDeleteFile(
  organizationId: string,
  actorId: string,
  fileId: string
): Promise<string> {
  const existing = await db.file.findFirst({
    where: { id: fileId, organizationId, isDeleted: false },
  });
  if (!existing) throw new Error("File not found");

  await db.file.update({
    where: { id: fileId },
    data: { isDeleted: true, deletedAt: new Date(), sharedToken: null, sharedExpiresAt: null },
  });

  await logActivity({
    organizationId,
    actorId,
    action: "file.deleted",
    entityType: existing.entityType,
    entityId: existing.entityId,
    metadata: { fileName: existing.fileName },
  });

  return existing.storageKey;
}
