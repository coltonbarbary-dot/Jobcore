import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function getApiOrg() {
  const { userId } = await auth();
  if (!userId) {
    return { org: null, userId: null, user: null, error: apiError("Unauthorized", 401) };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { organization: true },
  });

  if (!user?.organization) {
    return { org: null, userId, user: null, error: apiError("No organization found", 403) };
  }

  return { org: user.organization, userId, user, error: null };
}

export function apiResponse<T>(data: T, status = 200) {
  return NextResponse.json({ data, error: null }, { status });
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ data: null, error: message }, { status });
}
