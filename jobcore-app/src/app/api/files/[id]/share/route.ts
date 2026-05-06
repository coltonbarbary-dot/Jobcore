export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/auth";
import { generateShareToken } from "@/lib/services/files";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, org } = await requireOrg();

  const body = await req.json().catch(() => ({}));
  const expiresInDays = typeof body?.expiresInDays === "number" ? body.expiresInDays : 7;

  const token = await generateShareToken(org.id, user.id, id, expiresInDays);

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/p/files/${token}`;
  return NextResponse.json({ token, shareUrl });
}
