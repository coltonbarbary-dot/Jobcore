import { db } from "@/lib/db";
import { type Lead, type Customer, type Job, LeadStatus } from "@prisma/client";
import { logActivity } from "./activity";
import { createCustomer } from "./customers";
import { createJob } from "./jobs";

export type LeadWithRelations = Lead & {
  customer: Customer | null; // back-ref: customer created from this lead
  linkedCustomer?: { id: string; fullName: string } | null; // from customerId field
};

export type CreateLeadData = {
  title: string;
  status?: LeadStatus;
  source?: string;
  customerId?: string;
  description?: string;
  budgetEstimate?: number;
  notes?: string;
};

export type UpdateLeadData = Partial<CreateLeadData>;

export type ConvertLeadData = {
  // Customer to create (if no existing customer linked)
  createCustomer: boolean;
  customerFullName?: string;
  customerEmail?: string;
  customerPhone?: string;
  existingCustomerId?: string; // use this customer instead of creating one
  // Job to create (optional)
  createJob: boolean;
  jobTitle?: string;
  jobScheduledStart?: Date;
  jobScheduledEnd?: Date;
};

export async function listLeads(organizationId: string): Promise<LeadWithRelations[]> {
  const leads = await db.lead.findMany({
    where: { organizationId },
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  });

  // Batch-fetch customers referenced by customerId
  const linkedIds = [...new Set(leads.map((l) => l.customerId).filter(Boolean) as string[])];
  const linkedCustomers = linkedIds.length
    ? await db.customer.findMany({
        where: { id: { in: linkedIds }, organizationId },
        select: { id: true, fullName: true },
      })
    : [];
  const linkedMap = new Map(linkedCustomers.map((c) => [c.id, c]));

  return leads.map((lead) => ({
    ...lead,
    linkedCustomer: lead.customerId ? (linkedMap.get(lead.customerId) ?? null) : null,
  }));
}

export async function getLead(
  organizationId: string,
  leadId: string
): Promise<LeadWithRelations | null> {
  const lead = await db.lead.findFirst({
    where: { id: leadId, organizationId },
    include: { customer: true },
  });
  if (!lead) return null;

  const linkedCustomer = lead.customerId
    ? await db.customer.findFirst({
        where: { id: lead.customerId, organizationId },
        select: { id: true, fullName: true },
      })
    : null;

  return { ...lead, linkedCustomer };
}

export async function createLead(
  organizationId: string,
  actorId: string,
  data: CreateLeadData
): Promise<Lead> {
  const lead = await db.lead.create({
    data: {
      organizationId,
      title: data.title.trim(),
      status: data.status ?? "new",
      source: data.source?.trim() || null,
      customerId: data.customerId || null,
      description: data.description?.trim() || null,
      budgetEstimate: data.budgetEstimate ?? null,
      notes: data.notes?.trim() || null,
    },
  });

  await logActivity({
    organizationId,
    actorId,
    action: "lead.created",
    entityType: "lead",
    entityId: lead.id,
    metadata: { title: lead.title, status: lead.status },
  });

  return lead;
}

export async function updateLead(
  organizationId: string,
  actorId: string,
  leadId: string,
  data: UpdateLeadData
): Promise<Lead> {
  const existing = await db.lead.findFirst({ where: { id: leadId, organizationId } });
  if (!existing) throw new Error("Lead not found");

  const lead = await db.lead.update({
    where: { id: leadId },
    data: {
      title: data.title?.trim() ?? existing.title,
      status: data.status ?? existing.status,
      source: data.source !== undefined ? (data.source?.trim() || null) : existing.source,
      customerId: data.customerId !== undefined ? (data.customerId || null) : existing.customerId,
      description: data.description !== undefined ? (data.description?.trim() || null) : existing.description,
      budgetEstimate: data.budgetEstimate !== undefined ? data.budgetEstimate : existing.budgetEstimate,
      notes: data.notes !== undefined ? (data.notes?.trim() || null) : existing.notes,
    },
  });

  const events: Promise<void>[] = [
    logActivity({
      organizationId,
      actorId,
      action: "lead.updated",
      entityType: "lead",
      entityId: leadId,
      metadata: { fields: Object.keys(data) },
    }),
  ];

  if (data.status && data.status !== existing.status) {
    events.push(
      logActivity({
        organizationId,
        actorId,
        action: "lead.status_changed",
        entityType: "lead",
        entityId: leadId,
        metadata: { from: existing.status, to: data.status },
      })
    );
  }

  await Promise.all(events);
  return lead;
}

export type ConvertLeadResult = {
  lead: Lead;
  customer: Customer;
  job: Job | null;
};

export async function convertLead(
  organizationId: string,
  actorId: string,
  leadId: string,
  data: ConvertLeadData
): Promise<ConvertLeadResult> {
  const lead = await db.lead.findFirst({ where: { id: leadId, organizationId } });
  if (!lead) throw new Error("Lead not found");
  if (lead.status === "converted") throw new Error("Lead is already converted");

  // Resolve or create customer
  let customer: Customer;
  if (!data.createCustomer && data.existingCustomerId) {
    const existing = await db.customer.findFirst({
      where: { id: data.existingCustomerId, organizationId },
    });
    if (!existing) throw new Error("Selected customer not found");
    customer = existing;
  } else {
    if (!data.customerFullName?.trim()) throw new Error("Customer name is required");
    customer = await createCustomer(organizationId, actorId, {
      fullName: data.customerFullName,
      email: data.customerEmail,
      phone: data.customerPhone,
    });
    // Link this customer back to the lead
    await db.customer.update({
      where: { id: customer.id },
      data: { leadId: lead.id },
    });
  }

  // Optionally create a job
  let job: Job | null = null;
  if (data.createJob && data.jobTitle?.trim()) {
    job = await createJob(organizationId, actorId, {
      title: data.jobTitle,
      customerId: customer.id,
      leadId: lead.id,
      scheduledStart: data.jobScheduledStart,
      scheduledEnd: data.jobScheduledEnd,
    });
  }

  // Update lead to converted
  const updatedLead = await db.lead.update({
    where: { id: leadId },
    data: {
      status: "converted",
      convertedToJobId: job?.id ?? null,
      customerId: customer.id,
    },
  });

  await logActivity({
    organizationId,
    actorId,
    action: "lead.converted",
    entityType: "lead",
    entityId: leadId,
    metadata: {
      customerId: customer.id,
      customerName: customer.fullName,
      jobId: job?.id ?? null,
      jobTitle: job?.title ?? null,
    },
  });

  return { lead: updatedLead, customer, job };
}

export async function deleteLead(
  organizationId: string,
  actorId: string,
  leadId: string
): Promise<void> {
  const existing = await db.lead.findFirst({ where: { id: leadId, organizationId } });
  if (!existing) throw new Error("Lead not found");

  await db.lead.delete({ where: { id: leadId } });

  await logActivity({
    organizationId,
    actorId,
    action: "lead.deleted",
    entityType: "lead",
    entityId: leadId,
    metadata: { title: existing.title },
  });
}
