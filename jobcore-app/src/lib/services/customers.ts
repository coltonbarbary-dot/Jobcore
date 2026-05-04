import { db } from "@/lib/db";
import { type Customer, type Job } from "@prisma/client";
import { logActivity } from "./activity";

export type CustomerWithCounts = Customer & {
  _count: { jobs: number; estimates: number; invoices: number };
};

export type CustomerWithRelations = Customer & {
  jobs: Job[];
  _count: { jobs: number; estimates: number; invoices: number };
};

type Address = { street?: string; city?: string; state?: string; zip?: string };

export type CreateCustomerData = {
  fullName: string;
  email?: string;
  phone?: string;
  companyName?: string;
  billingAddress?: Address;
  notes?: string;
};

export type UpdateCustomerData = Partial<CreateCustomerData>;

export async function listCustomers(
  organizationId: string,
  { limit = 500, offset = 0 }: { limit?: number; offset?: number } = {}
): Promise<CustomerWithCounts[]> {
  return db.customer.findMany({
    where: { organizationId },
    include: { _count: { select: { jobs: true, estimates: true, invoices: true } } },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 500),
    skip: offset,
  });
}

export async function getCustomer(
  organizationId: string,
  customerId: string
): Promise<CustomerWithRelations | null> {
  return db.customer.findFirst({
    where: { id: customerId, organizationId },
    include: {
      jobs: { orderBy: { createdAt: "desc" }, take: 20 },
      _count: { select: { jobs: true, estimates: true, invoices: true } },
    },
  });
}

export async function createCustomer(
  organizationId: string,
  actorId: string,
  data: CreateCustomerData
): Promise<Customer> {
  const customer = await db.customer.create({
    data: {
      organizationId,
      fullName: data.fullName.trim(),
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      companyName: data.companyName?.trim() || null,
      billingAddress: data.billingAddress ?? undefined,
      notes: data.notes?.trim() || null,
    },
  });

  await logActivity({
    organizationId,
    actorId,
    action: "customer.created",
    entityType: "customer",
    entityId: customer.id,
    metadata: { fullName: customer.fullName },
  });

  return customer;
}

export async function updateCustomer(
  organizationId: string,
  actorId: string,
  customerId: string,
  data: UpdateCustomerData
): Promise<Customer> {
  const existing = await db.customer.findFirst({ where: { id: customerId, organizationId } });
  if (!existing) throw new Error("Customer not found");

  const customer = await db.customer.update({
    where: { id: customerId },
    data: {
      fullName: data.fullName?.trim() ?? existing.fullName,
      email: data.email !== undefined ? (data.email?.trim() || null) : existing.email,
      phone: data.phone !== undefined ? (data.phone?.trim() || null) : existing.phone,
      companyName: data.companyName !== undefined ? (data.companyName?.trim() || null) : existing.companyName,
      billingAddress: data.billingAddress !== undefined ? data.billingAddress : (existing.billingAddress ?? undefined),
      notes: data.notes !== undefined ? (data.notes?.trim() || null) : existing.notes,
    },
  });

  await logActivity({
    organizationId,
    actorId,
    action: "customer.updated",
    entityType: "customer",
    entityId: customerId,
    metadata: { fields: Object.keys(data) },
  });

  return customer;
}

export async function deleteCustomer(
  organizationId: string,
  actorId: string,
  customerId: string
): Promise<void> {
  const existing = await db.customer.findFirst({ where: { id: customerId, organizationId } });
  if (!existing) throw new Error("Customer not found");

  const [jobCount, estimateCount, invoiceCount] = await Promise.all([
    db.job.count({ where: { customerId, organizationId } }),
    db.estimate.count({ where: { customerId, organizationId } }),
    db.invoice.count({ where: { customerId, organizationId } }),
  ]);

  const blockers: string[] = [];
  if (jobCount > 0) blockers.push(`${jobCount} job${jobCount > 1 ? "s" : ""}`);
  if (estimateCount > 0) blockers.push(`${estimateCount} estimate${estimateCount > 1 ? "s" : ""}`);
  if (invoiceCount > 0) blockers.push(`${invoiceCount} invoice${invoiceCount > 1 ? "s" : ""}`);

  if (blockers.length > 0) {
    throw new Error(`Cannot delete customer with ${blockers.join(", ")}. Remove them first.`);
  }

  await db.customer.delete({ where: { id: customerId } });

  await logActivity({
    organizationId,
    actorId,
    action: "customer.deleted",
    entityType: "customer",
    entityId: customerId,
    metadata: { fullName: existing.fullName },
  });
}
