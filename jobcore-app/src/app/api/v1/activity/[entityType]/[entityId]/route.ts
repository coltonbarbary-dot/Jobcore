export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getApiOrg, apiResponse, apiError } from "@/lib/api";
import { listActivityForEntity } from "@/lib/services/activity";

const VALID_ENTITY_TYPES = ["customer", "lead", "job", "estimate", "invoice"];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ entityType: string; entityId: string }> }
) {
  const { entityType, entityId } = await params;
  const { org, error } = await getApiOrg();
  if (error) return error;

  if (!VALID_ENTITY_TYPES.includes(entityType)) {
    return apiError(`entityType must be one of: ${VALID_ENTITY_TYPES.join(", ")}`);
  }

  const limit = Math.min(Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") ?? "50")), 200);
  const offset = Math.max(0, parseInt(req.nextUrl.searchParams.get("offset") ?? "0"));
  const logs = await listActivityForEntity(org!.id, entityType, entityId, { limit, offset });
  return apiResponse(logs);
}