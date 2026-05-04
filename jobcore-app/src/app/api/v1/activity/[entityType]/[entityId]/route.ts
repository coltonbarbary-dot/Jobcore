import { NextRequest } from "next/server";
import { getApiOrg, apiResponse, apiError } from "@/lib/api";
import { listActivityForEntity } from "@/lib/services/activity";

const VALID_ENTITY_TYPES = ["customer", "lead", "job", "estimate", "invoice"];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ entityType: string; entityId: string }> }
) {
  const { entityType, entityId } = await params;
  const { org, error } = await getApiOrg();
  if (error) return error;

  if (!VALID_ENTITY_TYPES.includes(entityType)) {
    return apiError(`entityType must be one of: ${VALID_ENTITY_TYPES.join(", ")}`);
  }

  const logs = await listActivityForEntity(org!.id, entityType, entityId);
  return apiResponse(logs);
}
