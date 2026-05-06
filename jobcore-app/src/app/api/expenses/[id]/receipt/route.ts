export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/auth";
import { updateExpense, getExpense } from "@/lib/services/expenses";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, org } = await requireOrg();

  const body = await req.json().catch(() => null);
  const fileId = typeof body?.fileId === "string" ? body.fileId.trim() : "";
  if (!fileId) return NextResponse.json({ error: "fileId required" }, { status: 400 });

  const expense = await getExpense(org.id, id);
  if (!expense) return NextResponse.json({ error: "Expense not found" }, { status: 404 });

  await updateExpense(org.id, user.id, id, { receiptFileId: fileId });
  return NextResponse.json({ ok: true });
}
