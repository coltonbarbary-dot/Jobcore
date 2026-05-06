export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getApiOrg, apiResponse, apiError } from "@/lib/api";
import { listOrgActivity } from "@/lib/services/activity";

export async function GET(req: NextRequest) {
  const { org, error } = await getApiOrg();
  if (error) return error;
  const limit = Math.min(Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") ?? "50")), 200);
  const offset = Math.max(0, parseInt(req.nextUrl.searchParams.get("offset") ?? "0"));
  const logs = await listOrgActivity(org!.id, { limit, offset });
  return apiResponse(logs);
}
