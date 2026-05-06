export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getFileByToken } from "@/lib/services/files";
import { getSignedDownloadUrl } from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const file = await getFileByToken(token);
  if (!file) {
    return new NextResponse("File not found or link has expired.", { status: 404 });
  }

  if (file.sharedExpiresAt && file.sharedExpiresAt < new Date()) {
    return new NextResponse("This share link has expired.", { status: 410 });
  }

  // Generate a presigned URL valid for 15 minutes
  const url = await getSignedDownloadUrl(file.storageKey, 900);
  return NextResponse.redirect(url);
}
