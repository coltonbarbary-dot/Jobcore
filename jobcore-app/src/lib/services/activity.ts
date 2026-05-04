import { db } from "@/lib/db";
import { type ActorType } from "@prisma/client";

interface LogActivityParams {
  organizationId: string;
  actorId: string;
  actorType?: ActorType;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  const { organizationId, actorId, actorType = "user", action, entityType, entityId, metadata } = params;
  await db.activityLog.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { organizationId, actorId, actorType, action, entityType, entityId, metadata: (metadata ?? {}) as any },
  });
}

export async function listActivityForEntity(
  organizationId: string,
  entityType: string,
  entityId: string,
  { limit = 50, offset = 0 }: { limit?: number; offset?: number } = {}
) {
  return db.activityLog.findMany({
    where: { organizationId, entityType, entityId },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 200),
    skip: offset,
  });
}

export async function listOrgActivity(
  organizationId: string,
  { limit = 50, offset = 0 }: { limit?: number; offset?: number } = {}
) {
  return db.activityLog.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 200),
    skip: offset,
  });
}
