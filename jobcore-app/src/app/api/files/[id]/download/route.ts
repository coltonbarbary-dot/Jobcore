export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/auth";
import { getFile } from "@/lib/services/files";
import { getSignedDownloadUrl } from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { org } = await requireOrg();

  const file = await getFile(org.id, id);
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = await getSignedDownloadUrl(file.storageKey, 900);
  return NextResponse.redirect(url);
}
