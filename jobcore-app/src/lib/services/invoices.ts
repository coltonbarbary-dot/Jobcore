import { db } from "@/lib/db";
import { Prisma, type Invoice, type InvoiceItem, type Customer, type Job, type InvoiceStatus, type PaymentMethod } from "@prisma/client";
import { logActivity } from "./activity";

export type InvoiceItemInput = {
  description: string;
  quantity: number;
  unitPrice: number;
};

export type InvoiceWithRelations = Invoice & {
  customer: Pick<Customer, "id" | "fullName" | "email" | "phone">;
  job: Pick<Job, "id" | "title"> | null;
  items: InvoiceItem[];
  payments: {
    id: string;
    amount: Prisma.Decimal;
    method: PaymentMethod;
    paidAt: Date | null;
    referenceNumber: string | null;
    notes: string | null;
  }[];
};

export type CreateInvoiceData = {
  customerId: string;
  jobId?: string;
  dueDate?: Date;
  taxRate?: number;
  discountAmount?: number;
  notes?: string;
  terms?: string;
  items?: InvoiceItemInput[];
};

export type UpdateInvoiceData = Partial<CreateInvoiceData>;

export type RecordPaymentData = {
  amount: number;
  method: PaymentMethod;
  paidAt?: Date;
  referenceNumber?: string;
  notes?: string;
};

function computeTotals(items: InvoiceItemInput[], taxRate: number, discountAmount: number) {
  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  const total = Math.max(0, subtotal + taxAmount - discountAmount);
  return { subtotal, taxAmount, total };
}

async function nextInvoiceNumber(organizationId: string): Promise<string> {
  const latest = await db.invoice.findFirst({
    where: { organizationId, invoiceNumber: { startsWith: "INV-" } },
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  });

  let next = 1;
  if (latest) {
    const parsed = parseInt(latest.invoiceNumber.replace(/^INV-/, ""), 10);
    if (!isNaN(parsed)) next = parsed + 1;
  }

  return `INV-${String(next).padStart(4, "0")}`;
}

function isNumberConflict(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    e.code === "P2002" &&
    Array.isArray((e.meta as { target?: string[] } | undefined)?.target) &&
    ((e.meta as { target: string[] }).target).some((f) => f.includes("invoiceNumber"))
  );
}

const INVOICE_INCLUDE = {
  customer: { select: { id: true, fullName: true, email: true, phone: true } },
  job: { select: { id: true, title: true } },
  items: { orderBy: { sortOrder: "asc" as const } },
  payments: {
    select: {
      id: true,
      amount: true,
      method: true,
      paidAt: true,
      referenceNumber: true,
      notes: true,
    },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

export async function listInvoices(
  organizationId: string,
  { limit = 500, offset = 0 }: { limit?: number; offset?: number } = {}
): Promise<InvoiceWithRelations[]> {
  return db.invoice.findMany({
    where: { organizationId },
    include: INVOICE_INCLUDE,
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 500),
    skip: offset,
  }) as Promise<InvoiceWithRelations[]>;
}

export async function getInvoice(
  organizationId: string,
  invoiceId: string
): Promise<InvoiceWithRelations | null> {
  return db.invoice.findFirst({
    where: { id: invoiceId, organizationId },
    include: INVOICE_INCLUDE,
  }) as Promise<InvoiceWithRelations | null>;
}

export async function getInvoiceByToken(token: string): Promise<InvoiceWithRelations | null> {
  return db.invoice.findUnique({
    where: { publicToken: token },
    include: INVOICE_INCLUDE,
  }) as Promise<InvoiceWithRelations | null>;
}

export async function createInvoice(
  organizationId: string,
  actorId: string,
  data: CreateInvoiceData
): Promise<Invoice> {
  const items = data.items ?? [];
  const taxRate = data.taxRate ?? 0;
  const discountAmount = data.discountAmount ?? 0;
  const { subtotal, taxAmount, total } = computeTotals(items, taxRate, discountAmount);
  const amountDue = total;

  const itemData = items.map((item, i) => ({
    description: item.description.trim(),
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    subtotal: item.quantity * item.unitPrice,
    sortOrder: i,
  }));

  const MAX_RETRIES = 5;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const invoiceNumber = await nextInvoiceNumber(organizationId);
    try {
      const invoice = await db.invoice.create({
        data: {
          organizationId,
          customerId: data.customerId,
          jobId: data.jobId ?? null,
          invoiceNumber,
          status: "draft",
          dueDate: data.dueDate ?? null,
          taxRate,
          subtotal,
          taxAmount,
          discountAmount,
          total,
          amountPaid: 0,
          amountDue,
          notes: data.notes?.trim() || null,
          terms: data.terms?.trim() || null,
          items: { create: itemData },
        },
      });

      await logActivity({
        organizationId,
        actorId,
        action: "invoice.created",
        entityType: "invoice",
        entityId: invoice.id,
        metadata: { invoiceNumber: invoice.invoiceNumber, total },
      });

      return invoice;
    } catch (e) {
      if (isNumberConflict(e)) continue;
      throw e;
    }
  }

  throw new Error("Could not generate a unique invoice number after 5 attempts. Please try again.");
}

export async function updateInvoice(
  organizationId: string,
  actorId: string,
  invoiceId: string,
  data: UpdateInvoiceData
): Promise<Invoice> {
  const existing = await db.invoice.findFirst({ where: { id: invoiceId, organizationId } });
  if (!existing) throw new Error("Invoice not found");
  if (existing.status === "paid" || existing.status === "void") {
    throw new Error(`Cannot edit a ${existing.status} invoice`);
  }

  const items = data.items;
  const taxRate = data.taxRate ?? Number(existing.taxRate);
  const discountAmount = data.discountAmount ?? Number(existing.discountAmount);
  const currentItems: InvoiceItemInput[] = items ?? [];
  const { subtotal, taxAmount, total } = items
    ? computeTotals(currentItems, taxRate, discountAmount)
    : {
        subtotal: Number(existing.subtotal),
        taxAmount: Number(existing.taxAmount),
        total: Number(existing.total),
      };

  const amountPaid = Number(existing.amountPaid);
  const amountDue = Math.max(0, total - amountPaid);

  const invoice = await db.invoice.update({
    where: { id: invoiceId },
    data: {
      customerId: data.customerId ?? existing.customerId,
      jobId: data.jobId !== undefined ? (data.jobId ?? null) : existing.jobId,
      dueDate: data.dueDate !== undefined ? (data.dueDate ?? null) : existing.dueDate,
      taxRate: data.taxRate !== undefined ? data.taxRate : existing.taxRate,
      discountAmount: data.discountAmount !== undefined ? data.discountAmount : existing.discountAmount,
      subtotal,
      taxAmount,
      total,
      amountDue,
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
    action: "invoice.updated",
    entityType: "invoice",
    entityId: invoiceId,
    metadata: { fields: Object.keys(data) },
  });

  return invoice;
}

export async function markInvoiceSent(
  organizationId: string,
  actorId: string,
  invoiceId: string,
  token: string
): Promise<void> {
  await db.invoice.update({
    where: { id: invoiceId },
    data: { status: "sent", sentAt: new Date(), publicToken: token },
  });
  await logActivity({
    organizationId,
    actorId,
    action: "invoice.sent",
    entityType: "invoice",
    entityId: invoiceId,
  });
}

export async function markInvoiceViewed(token: string): Promise<void> {
  const invoice = await db.invoice.findUnique({ where: { publicToken: token } });
  if (!invoice || invoice.viewedAt) return;
  if (invoice.status !== "sent") return;

  await db.invoice.update({
    where: { publicToken: token },
    data: { status: "viewed", viewedAt: new Date() },
  });
  await logActivity({
    organizationId: invoice.organizationId,
    actorId: "system",
    actorType: "system",
    action: "invoice.viewed",
    entityType: "invoice",
    entityId: invoice.id,
  });
}

export async function recordPayment(
  organizationId: string,
  actorId: string,
  invoiceId: string,
  data: RecordPaymentData,
  stripePaymentIntentId?: string
): Promise<void> {
  const invoice = await db.invoice.findFirst({ where: { id: invoiceId, organizationId } });
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status === "void") throw new Error("Cannot record payment on a voided invoice");

  if (stripePaymentIntentId) {
    const existing = await db.payment.findUnique({ where: { stripePaymentIntentId } });
    if (existing) return; // idempotent — already recorded
  }

  const newAmountPaid = Number(invoice.amountPaid) + data.amount;
  const newAmountDue = Math.max(0, Number(invoice.total) - newAmountPaid);
  const isPaid = newAmountDue <= 0;
  const newStatus: InvoiceStatus = isPaid ? "paid" : "partial";

  await db.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        organizationId,
        invoiceId,
        amount: data.amount,
        method: data.method,
        status: "succeeded",
        stripePaymentIntentId: stripePaymentIntentId ?? null,
        paidAt: data.paidAt ?? new Date(),
        referenceNumber: data.referenceNumber ?? null,
        notes: data.notes ?? null,
      },
    });

    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        amountPaid: newAmountPaid,
        amountDue: newAmountDue,
        status: newStatus,
        ...(isPaid && { paidAt: new Date() }),
      },
    });
  });

  await logActivity({
    organizationId,
    actorId,
    action: "payment.received",
    entityType: "invoice",
    entityId: invoiceId,
    metadata: { amount: data.amount, method: data.method, isPaid },
  });
}

export async function voidInvoice(
  organizationId: string,
  actorId: string,
  invoiceId: string
): Promise<void> {
  const existing = await db.invoice.findFirst({ where: { id: invoiceId, organizationId } });
  if (!existing) throw new Error("Invoice not found");
  if (existing.status === "paid") throw new Error("Cannot void a paid invoice");
  if (existing.status === "void") return; // idempotent

  await db.invoice.update({
    where: { id: invoiceId },
    data: { status: "void" },
  });
  await logActivity({
    organizationId,
    actorId,
    action: "invoice.voided",
    entityType: "invoice",
    entityId: invoiceId,
  });
}

export async function deleteInvoice(
  organizationId: string,
  actorId: string,
  invoiceId: string
): Promise<void> {
  const existing = await db.invoice.findFirst({ where: { id: invoiceId, organizationId } });
  if (!existing) throw new Error("Invoice not found");
  if (existing.status !== "draft") {
    throw new Error(`Cannot delete a ${existing.status} invoice. Only drafts can be deleted.`);
  }

  await db.invoice.delete({ where: { id: invoiceId } });
  await logActivity({
    organizationId,
    actorId,
    action: "invoice.deleted",
    entityType: "invoice",
    entityId: invoiceId,
    metadata: { invoiceNumber: existing.invoiceNumber },
  });
}

export async function markInvoicesOverdue(organizationId: string): Promise<number> {
  const now = new Date();
  const result = await db.invoice.updateMany({
    where: {
      organizationId,
      status: { in: ["sent", "viewed"] },
      dueDate: { lt: now },
    },
    data: { status: "overdue" },
  });
  return result.count;
}
