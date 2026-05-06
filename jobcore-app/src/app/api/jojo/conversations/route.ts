export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireOrg } from "@/lib/auth";
import { listConversations } from "@/lib/services/jojo";

export async function GET() {
  const { user, org } = await requireOrg();
  const conversations = await listConversations(org.id, user.id);
  return NextResponse.json({ conversations });
}
