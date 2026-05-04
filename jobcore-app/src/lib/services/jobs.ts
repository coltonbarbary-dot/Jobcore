import { db } from "@/lib/db";
import { type Job, type JobItem, type Customer, JobStatus, JobPriority } from "@prisma/client";
import { logActivity } from "./activity";

export type JobItemInput = {
  description: string;
  quantity: number;
  unitPrice: number;
};

export type JobWithRelations = Job & {
  customer: Pick<Customer, "id" | "fullName" | "email" | "phone">;
  items: JobItem[];
};

export type CreateJobData = {
  title: string;
  customerId: string;
  leadId?: string;
  estimateId?: string;
  description?: string;
  status?: JobStatus;
  priority?: JobPriority;
  jobType?: string;
  locationAddress?: { street?: string; city?: string; state?: string; zip?: string };
  scheduledStart?: Date;
  scheduledEnd?: Date;
  notes?: string;
  items?: JobItemInput[];
};

export type UpdateJobData = Omit<Partial<CreateJobData>, "customerId" | "scheduledStart" | "scheduledEnd"> & {
  customerId?: string;
  scheduledStart?: Date | null;
  scheduledEnd?: Date | null;
};

function computeTotal(items: JobItemInput[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

export async function listJobs(
  organizationId: string,
  { limit = 500, offset = 0 }: { limit?: number; offset?: number } = {}
): Promise<JobWithRelations[]> {
  return db.job.findMany({
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

export async function getJob(
  organizationId: string,
  jobId: string
): Promise<JobWithRelations | null> {
  return db.job.findFirst({
    where: { id: jobId, organizationId },
    include: {
      customer: { select: { id: true, fullName: true, email: true, phone: true } },
      items: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function createJob(
  organizationId: string,
  actorId: string,
  data: CreateJobData
): Promise<Job> {
  const items = data.items ?? [];
  const total = computeTotal(items);

  const job = await db.job.create({
    data: {
      organizationId,
      customerId: data.customerId,
      leadId: data.leadId ?? null,
      estimateId: data.estimateId ?? null,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      status: data.status ?? "draft",
      priority: data.priority ?? "normal",
      jobType: data.jobType?.trim() || null,
      locationAddress: data.locationAddress ?? undefined,
      scheduledStart: data.scheduledStart ?? null,
      scheduledEnd: data.scheduledEnd ?? null,
      notes: data.notes?.trim() || null,
      totalAmount: total,
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
    action: "job.created",
    entityType: "job",
    entityId: job.id,
    metadata: { title: job.title, status: job.status },
  });

  if (job.scheduledStart) {
    await logActivity({
      organizationId,
      actorId,
      action: "job.scheduled",
      entityType: "job",
      entityId: job.id,
      metadata: { scheduledStart: job.scheduledStart, scheduledEnd: job.scheduledEnd },
    });
  }

  return job;
}

export async function updateJob(
  organizationId: string,
  actorId: string,
  jobId: string,
  data: UpdateJobData
): Promise<Job> {
  const existing = await db.job.findFirst({ where: { id: jobId, organizationId } });
  if (!existing) throw new Error("Job not found");

  const wasScheduled = !!existing.scheduledStart;

  const items = data.items;
  const total = items ? computeTotal(items) : Number(existing.totalAmount ?? 0);

  const job = await db.job.update({
    where: { id: jobId },
    data: {
      title: data.title?.trim() ?? existing.title,
      customerId: data.customerId ?? existing.customerId,
      description: data.description !== undefined ? (data.description?.trim() || null) : existing.description,
      status: data.status ?? existing.status,
      priority: data.priority ?? existing.priority,
      jobType: data.jobType !== undefined ? (data.jobType?.trim() || null) : existing.jobType,
      locationAddress: data.locationAddress !== undefined ? data.locationAddress : (existing.locationAddress ?? undefined),
      scheduledStart: data.scheduledStart !== undefined ? (data.scheduledStart ?? null) : existing.scheduledStart,
      scheduledEnd: data.scheduledEnd !== undefined ? (data.scheduledEnd ?? null) : existing.scheduledEnd,
      notes: data.notes !== undefined ? (data.notes?.trim() || null) : existing.notes,
      totalAmount: total,
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
    action: "job.updated",
    entityType: "job",
    entityId: jobId,
    metadata: { fields: Object.keys(data) },
  });

  const isNowScheduled = !!job.scheduledStart;
  if (!wasScheduled && isNowScheduled) {
    await logActivity({
      organizationId,
      actorId,
      action: "job.scheduled",
      entityType: "job",
      entityId: jobId,
      metadata: { scheduledStart: job.scheduledStart, scheduledEnd: job.scheduledEnd },
    });
  }

  return job;
}

export async function updateJobStatus(
  organizationId: string,
  actorId: string,
  jobId: string,
  status: JobStatus
): Promise<Job> {
  const existing = await db.job.findFirst({ where: { id: jobId, organizationId } });
  if (!existing) throw new Error("Job not found");
  if (existing.status === status) return existing;

  const job = await db.job.update({
    where: { id: jobId },
    data: {
      status,
      actualStart: status === "in_progress" && !existing.actualStart ? new Date() : existing.actualStart,
      actualEnd: status === "completed" && !existing.actualEnd ? new Date() : existing.actualEnd,
    },
  });

  await logActivity({
    organizationId,
    actorId,
    action: "job.status_changed",
    entityType: "job",
    entityId: jobId,
    metadata: { from: existing.status, to: status },
  });

  return job;
}

export async function listScheduledJobs(
  organizationId: string,
  { from, to }: { from: Date; to: Date }
): Promise<JobWithRelations[]> {
  return db.job.findMany({
    where: {
      organizationId,
      scheduledStart: { gte: from, lt: to },
    },
    include: {
      customer: { select: { id: true, fullName: true, email: true, phone: true } },
      items: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { scheduledStart: "asc" },
  });
}

export async function deleteJob(
  organizationId: string,
  actorId: string,
  jobId: string
): Promise<void> {
  const existing = await db.job.findFirst({ where: { id: jobId, organizationId } });
  if (!existing) throw new Error("Job not found");

  const invoiceCount = await db.invoice.count({ where: { jobId, organizationId } });
  if (invoiceCount > 0) {
    throw new Error(`Cannot delete job with ${invoiceCount} invoice${invoiceCount > 1 ? "s" : ""}. Void invoices first.`);
  }

  await db.job.delete({ where: { id: jobId } });

  await logActivity({
    organizationId,
    actorId,
    action: "job.deleted",
    entityType: "job",
    entityId: jobId,
    metadata: { title: existing.title },
  });
}
