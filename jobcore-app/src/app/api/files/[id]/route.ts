import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/auth";
import { renameFile, softDeleteFile } from "@/lib/services/files";
import { deleteFromStorage } from "@/lib/storage";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, org } = await requireOrg();

  const body = await req.json();
  const newName = typeof body?.fileName === "string" ? body.fileName.trim() : "";
  if (!newName) return NextResponse.json({ error: "fileName is required" }, { status: 400 });

  const file = await renameFile(org.id, user.id, id, newName);
  return NextResponse.json({ id: file.id, fileName: file.fileName });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, org } = await requireOrg();

  const storageKey = await softDeleteFile(org.id, user.id, id);

  // Hard-delete from storage (best-effort; soft delete already committed)
  try {
    await deleteFromStorage(storageKey);
  } catch {
    // log but don't fail — the DB record is already soft-deleted
    console.error(`Failed to delete storage object ${storageKey}`);
  }

  return NextResponse.json({ ok: true });
}
