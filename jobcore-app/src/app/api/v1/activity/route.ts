import { getApiOrg, apiResponse, apiError } from "@/lib/api";
import { listOrgActivity } from "@/lib/services/activity";

export async function GET() {
  const { org, error } = await getApiOrg();
  if (error) return error;
  const logs = await listOrgActivity(org!.id);
  return apiResponse(logs);
}
