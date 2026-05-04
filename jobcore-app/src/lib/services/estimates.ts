import { db } from "@/lib/db";
import { type Estimate, type EstimateItem, type Customer, type Job, EstimateStatus } from "@prisma/client";
import { logActivity } from "./activity";
import { createJob } from "./jobs";

export type EstimateItemInput = {
  description: string;
  quantity: number;
  unitPrice: number;
};

export type EstimateWithRelations = Estimate & {
  customer: Pick<Customer, "id" | "fullName" | "email" | "phone">;
  items: EstimateItem[];
};

export type CreateEstimateData = {
  title: string;
  customerId: string;
  validUntil?: Date;
  taxRate?: number; // decimal fraction e.g. 0.085 for 8.5%
  notes?: string;
  terms?: string;
  items?: EstimateItemInput[];
};

export type UpdateEstimateData = Partial<CreateEstimateData>;

function computeTotals(items: EstimateItemInput[], taxRate: number) {
  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  const total = subtotal + taxAmount;
  return { subtotal, taxAmount, total };
}

async function nextEstimateNumber(organizationId: string): Promise<string> {
  const count = await db.estimate.count({ where: { organizationId } });
  return `EST-${String(count + 1).padStart(4, "0")}`;
}

export async function listEstimates(
  organizationId: string,
  { limit = 500, offset = 0 }: { limit?: number; offset?: number } = {}
): Promise<EstimateWithRelations[]> {
  return db.estimate.findMany({
    where: { organizationId },
    include: {
      customer: { select: { id: true, fullName: true, email: true, phone: true } },
      items: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 500),
    skip: offset,
  });
}

export async function getEstimate(
  organizationId: string,
  estimateId: string
): Promise<EstimateWithRelations | null> {
  return db.estimate.findFirst({
    where: { id: estimateId, organizationId },
    include: {
      customer: { select: { id: true, fullName: true, email: true, phone: true } },
      items: { orderBy: { sortOrder: "asc" } },
    },
  });
}

// Public access — no org filter, only by token
export async function getEstimateByToken(token: string): Promise<EstimateWithRelations | null> {
  return db.estimate.findUnique({
    where: { approvalToken: token },
    include: {
      customer: { select: { id: true, fullName: true, email: true, phone: true } },
      items: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function createEstimate(
  organizationId: string,
  actorId: string,
  data: CreateEstimateData
): Promise<Estimate> {
  const items = data.items ?? [];
  const taxRate = data.taxRate ?? 0;
  const { subtotal, taxAmount, total } = computeTotals(items, taxRate);

  let estimateNumber: string;
  try {
    estimateNumber = await nextEstimateNumber(organizationId);
    const estimate = await db.estimate.create({
      data: {
        organizationId,
        customerId: data.customerId,
        estimateNumber,
        title: data.title.trim(),
        status: "draft",
        validUntil: data.validUntil ?? null,
        taxRate,
        subtotal,
        taxAmount,
        total,
        notes: data.notes?.trim() || null,
        terms: data.terms?.trim() || null,
        items: {
          create: items.map((item, i) => ({
            description: item.description.trim(),
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.quantity * item.unitPrice,
            sortOrder: i,
          })),
        },
      },
    });
    await logActivity({
      organizationId,
      actorId,
      action: "estimate.created",
      entityType: "estimate",
      entityId: estimate.id,
      metadata: { estimateNumber: estimate.estimateNumber, title: estimate.title, total },
    });
    return estimate;
  } catch (e: unknown) {
    // Unique constraint on estimateNumber — retry once
    if (
      e instanceof Error &&
      e.message.includes("Unique constraint") &&
      e.message.includes("estimateNumber")
    ) {
      estimateNumber = `EST-${Date.now()}`;
      return db.estimate.create({
        data: {
          organizationId,
          customerId: data.customerId,
          estimateNumber,
          title: data.title.trim(),
          status: "draft",
          validUntil: data.validUntil ?? null,
          taxRate,
          subtotal,
          taxAmount,
          total,
          notes: data.notes?.trim() || null,
          terms: data.terms?.trim() || null,
          items: {
            create: (data.items ?? []).map((item, i) => ({
              description: item.description.trim(),
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.quantity * item.unitPrice,
              sortOrder: i,
            })),
          },
        },
      });
    }
    throw e;
  }
}

export async function updateEstimate(
  organizationId: string,
  actorId: string,
  estimateId: string,
  data: UpdateEstimateData
): Promise<Estimate> {
  const existing = await db.estimate.findFirst({ where: { id: estimateId, organizationId } });
  if (!existing) throw new Error("Estimate not found");
  if (existing.status === "approved" || existing.status === "declined") {
    throw new Error(`Cannot edit a ${existing.status} estimate`);
  }

  const items = data.items;
  const taxRate = data.taxRate ?? Number(existing.taxRate);
  const currentItems: EstimateItemInput[] = items ?? [];
  const { subtotal, taxAmount, total } = items
    ? computeTotals(currentItems, taxRate)
    : {
        subtotal: Number(existing.subtotal),
        taxAmount: Number(existing.taxAmount),
        total: Number(existing.total),
      };

  const estimate = await db.estimate.update({
    where: { id: estimateId },
    data: {
      title: data.title?.trim() ?? existing.title,
      customerId: data.customerId ?? existing.customerId,
      validUntil: data.validUntil !== undefined ? (data.validUntil ?? null) : existing.validUntil,
      taxRate: data.taxRate !== undefined ? data.taxRate : existing.taxRate,
      subtotal,
      taxAmount,
      total,
      notes: data.notes !== undefined ? (data.notes?.trim() || null) : existing.notes,
      terms: data.terms !== undefined ? (data.terms?.trim() || null) : existing.terms,
      ...(items !== undefined && {
        items: {
          deleteMany: {},
          create: items.map((item, i) => ({
            description: item.description.trim(),
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.quantity * item.unitPrice,
            sortOrder: i,
          })),
        },
      }),
    },
  });

  await logActivity({
    organizationId,
    actorId,
    action: "estimate.updated",
    entityType: "estimate",
    entityId: estimateId,
    metadata: { fields: Object.keys(data) },
  });

  return estimate;
}

export async function markEstimateSent(
  organizationId: string,
  actorId: string,
  estimateId: string,
  token: string
): Promise<void> {
  await db.estimate.update({
    where: { id: estimateId },
    data: { status: "sent", sentAt: new Date(), approvalToken: token },
  });
  await logActivity({
    organizationId,
    actorId,
    action: "estimate.sent",
    entityType: "estimate",
    entityId: estimateId,
  });
}

export async function markEstimateViewed(token: string): Promise<void> {
  const estimate = await db.estimate.findUnique({ where: { approvalToken: token } });
  if (!estimate || estimate.viewedAt) return;
  if (estimate.status !== "sent") return;

  await db.estimate.update({
    where: { approvalToken: token },
    data: { status: "viewed", viewedAt: new Date() },
  });
  await logActivity({
    organizationId: estimate.organizationId,
    actorId: "system",
    actorType: "system",
    action: "estimate.viewed",
    entityType: "estimate",
    entityId: estimate.id,
  });
}

export type ApproveEstimateResult = {
  jobId: string;
  alreadyApproved: boolean;
};

export async function approveEstimate(token: string): Promise<ApproveEstimateResult> {
  const estimate = await db.estimate.findUnique({
    where: { approvalToken: token },
    include: { items: true },
  });
  if (!estimate) throw new Error("Estimate not found");
  if (estimate.status === "declined") throw new Error("This estimate has been declined");
  if (estimate.validUntil && estimate.validUntil < new Date()) {
    throw new Error("This estimate has expired");
  }

  // Idempotency: already approved — return existing job
  if (estimate.status === "approved") {
    const existingJob = await db.job.findFirst({ where: { estimateId: estimate.id } });
    return { jobId: existingJob?.id ?? "", alreadyApproved: true };
  }

  // Transaction: check status once more, approve estimate, create job
  const result = await db.$transaction(async (tx) => {
    const fresh = await tx.estimate.findUnique({ where: { id: estimate.id }, select: { status: true } });
    if (fresh?.status === "approved") {
      const existingJob = await tx.job.findFirst({ where: { estimateId: estimate.id } });
      return { job: existingJob, alreadyApproved: true as const };
    }

    await tx.estimate.update({
      where: { id: estimate.id },
      data: { status: "approved", approvedAt: new Date() },
    });

    const job = await tx.job.create({
      data: {
        organizationId: estimate.organizationId,
        customerId: estimate.customerId,
        estimateId: estimate.id,
        title: estimate.title,
        description: estimate.notes ?? null,
        status: "draft",
        priority: "normal",
        totalAmount: estimate.total,
        items: {
          create: estimate.items.map((item, i) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
            sortOrder: i,
          })),
        },
      },
    });

    return { job, alreadyApproved: false as const };
  });

  if (!result.alreadyApproved && result.job) {
    await logActivity({
      organizationId: estimate.organizationId,
      actorId: "system",
      actorType: "system",
      action: "estimate.approved",
      entityType: "estimate",
      entityId: estimate.id,
      metadata: { jobId: result.job.id },
    });
    await logActivity({
      organizationId: estimate.organizationId,
      actorId: "system",
      actorType: "system",
      action: "job.created",
      entityType: "job",
      entityId: result.job.id,
      metadata: { fromEstimate: estimate.id, estimateNumber: estimate.estimateNumber },
    });
  }

  return { jobId: result.job?.id ?? "", alreadyApproved: result.alreadyApproved };
}

export async function declineEstimate(token: string): Promise<void> {
  const estimate = await db.estimate.findUnique({ where: { approvalToken: token } });
  if (!estimate) throw new Error("Estimate not found");
  if (estimate.status === "declined") return; // idempotent
  if (estimate.status === "approved") throw new Error("This estimate has already been approved");

  await db.estimate.update({
    where: { approvalToken: token },
    data: { status: "declined", declinedAt: new Date() },
  });
  await logActivity({
    organizationId: estimate.organizationId,
    actorId: "system",
    actorType: "system",
    action: "estimate.declined",
    entityType: "estimate",
    entityId: estimate.id,
  });
}

export async function deleteEstimate(
  organizationId: string,
  actorId: string,
  estimateId: string
): Promise<void> {
  const existing = await db.estimate.findFirst({ where: { id: estimateId, organizationId } });
  if (!existing) throw new Error("Estimate not found");
  if (existing.status !== "draft") {
    throw new Error(`Cannot delete a ${existing.status} estimate. Only drafts can be deleted.`);
  }

  await db.estimate.delete({ where: { id: estimateId } });
  await logActivity({
    organizationId,
    actorId,
    action: "estimate.deleted",
    entityType: "estimate",
    entityId: estimateId,
    metadata: { estimateNumber: existing.estimateNumber, title: existing.title },
  });
}
