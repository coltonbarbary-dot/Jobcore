export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/auth";
import { buildStorageKey, uploadToStorage } from "@/lib/storage";
import { createFile } from "@/lib/services/files";
import { randomUUID } from "crypto";
import path from "path";

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

export async function POST(req: NextRequest) {
  const { user, org } = await requireOrg();

  const formData = await req.formData();
  const file = formData.get("file");
  const entityType = formData.get("entityType");
  const entityId = formData.get("entityId");
  const customerId = formData.get("customerId") as string | null;
  const jobId = formData.get("jobId") as string | null;

  if (!(file instanceof File) || typeof entityType !== "string" || typeof entityId !== "string") {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!["job", "customer", "estimate", "invoice", "lead", "expense"].includes(entityType)) {
    return NextResponse.json({ error: "Invalid entityType" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds 50 MB limit" }, { status: 413 });
  }

  const fileId = randomUUID();
  const ext = path.extname(file.name).replace(/^\./, "");
  const storageKey = buildStorageKey(org.id, entityType, fileId, ext);
  const buffer = Buffer.from(await file.arrayBuffer());

  await uploadToStorage(storageKey, buffer, file.type || "application/octet-stream");

  const record = await createFile({
    organizationId: org.id,
    uploadedBy: user.id,
    entityType,
    entityId,
    customerId: customerId ?? undefined,
    jobId: jobId ?? undefined,
    fileName: file.name,
    storageKey,
    mimeType: file.type || undefined,
    fileSizeBytes: BigInt(file.size),
  });

  return NextResponse.json({ id: record.id, fileName: record.fileName });
}