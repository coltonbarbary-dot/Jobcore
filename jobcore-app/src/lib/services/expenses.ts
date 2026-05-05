import { db } from "@/lib/db";
import { type Expense } from "@prisma/client";
import { logActivity } from "./activity";

export const EXPENSE_CATEGORIES = [
  "Materials",
  "Labor",
  "Equipment",
  "Fuel",
  "Travel",
  "Office Supplies",
  "Software",
  "Marketing",
  "Subcontractor",
  "Other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export type ExpenseWithReceipt = Expense & {
  receiptFile: { id: string; fileName: string; mimeType: string | null; fileSizeBytes: bigint | null; storageKey: string } | null;
  job: { id: string; title: string } | null;
};

export type CreateExpenseData = {
  vendor?: string;
  amount: number;
  category: string;
  date: Date;
  description?: string;
  jobId?: string;
};

export type UpdateExpenseData = Partial<CreateExpenseData & { receiptFileId: string | null }>;

export type ExpenseFilters = {
  from?: Date;
  to?: Date;
  category?: string;
  jobId?: string;
};

// ─── List ──────────────────────────────────────────────────────────────────

export async function listExpenses(
  organizationId: string,
  filters: ExpenseFilters = {}
): Promise<ExpenseWithReceipt[]> {
  const dateFilter: Record<string, Date> = {};
  if (filters.from) dateFilter.gte = filters.from;
  if (filters.to) dateFilter.lte = filters.to;

  return db.expense.findMany({
    where: {
      organizationId,
      ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
      ...(filters.category && { category: filters.category }),
      ...(filters.jobId && { jobId: filters.jobId }),
    },
    include: {
      job: { select: { id: true, title: true } },
      receiptFile: {
        select: { id: true, fileName: true, mimeType: true, fileSizeBytes: true, storageKey: true },
      },
    },
    orderBy: { date: "desc" },
    take: 500,
  });
}

// ─── Get single ────────────────────────────────────────────────────────────

export async function getExpense(
  organizationId: string,
  expenseId: string
): Promise<ExpenseWithReceipt | null> {
  return db.expense.findFirst({
    where: { id: expenseId, organizationId },
    include: {
      job: { select: { id: true, title: true } },
      receiptFile: {
        select: { id: true, fileName: true, mimeType: true, fileSizeBytes: true, storageKey: true },
      },
    },
  });
}

// ─── Create ────────────────────────────────────────────────────────────────

export async function createExpense(
  organizationId: string,
  userId: string,
  data: CreateExpenseData
): Promise<Expense> {
  const expense = await db.expense.create({
    data: {
      organizationId,
      createdBy: userId,
      vendor: data.vendor?.trim() || null,
      amount: data.amount,
      category: data.category,
      date: data.date,
      description: data.description?.trim() || null,
      jobId: data.jobId || null,
    },
  });

  await logActivity({
    organizationId,
    actorId: userId,
    action: "expense.created",
    entityType: "expense",
    entityId: expense.id,
    metadata: { amount: String(data.amount), category: data.category, vendor: data.vendor },
  });

  return expense;
}

// ─── Update ────────────────────────────────────────────────────────────────

export async function updateExpense(
  organizationId: string,
  userId: string,
  expenseId: string,
  data: UpdateExpenseData
): Promise<Expense> {
  const existing = await db.expense.findFirst({ where: { id: expenseId, organizationId } });
  if (!existing) throw new Error("Expense not found");

  const expense = await db.expense.update({
    where: { id: expenseId },
    data: {
      ...(data.vendor !== undefined && { vendor: data.vendor?.trim() || null }),
      ...(data.amount !== undefined && { amount: data.amount }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.date !== undefined && { date: data.date }),
      ...(data.description !== undefined && { description: data.description?.trim() || null }),
      ...(data.jobId !== undefined && { jobId: data.jobId || null }),
      ...("receiptFileId" in data && { receiptFileId: data.receiptFileId ?? null }),
    },
  });

  await logActivity({
    organizationId,
    actorId: userId,
    action: "expense.updated",
    entityType: "expense",
    entityId: expenseId,
    metadata: {},
  });

  return expense;
}

// ─── Delete ────────────────────────────────────────────────────────────────

export async function deleteExpense(
  organizationId: string,
  expenseId: string
): Promise<void> {
  await db.expense.delete({ where: { id: expenseId, organizationId } });
}

// ─── Reports ───────────────────────────────────────────────────────────────

export type ReportSummary = {
  totalRevenue: number;
  outstandingInvoices: number;
  totalExpenses: number;
  estimatedNetProfit: number;
  completedJobsCount: number;
  expensesByCategory: { category: string; total: number }[];
};

export async function getReportSummary(organizationId: string): Promise<ReportSummary> {
  const [revenueResult, outstandingResult, expensesResult, completedJobs, expensesByCategory] =
    await Promise.all([
      db.payment.aggregate({
        where: { organizationId, status: "succeeded" },
        _sum: { amount: true },
      }),
      db.invoice.aggregate({
        where: {
          organizationId,
          status: { in: ["sent", "viewed", "partial", "overdue"] },
        },
        _sum: { amountDue: true },
      }),
      db.expense.aggregate({
        where: { organizationId },
        _sum: { amount: true },
      }),
      db.job.count({ where: { organizationId, status: "completed" } }),
      db.expense.groupBy({
        by: ["category"],
        where: { organizationId },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
      }),
    ]);

  const totalRevenue = revenueResult._sum.amount?.toNumber() ?? 0;
  const outstandingInvoices = outstandingResult._sum.amountDue?.toNumber() ?? 0;
  const totalExpenses = expensesResult._sum.amount?.toNumber() ?? 0;

  return {
    totalRevenue,
    outstandingInvoices,
    totalExpenses,
    estimatedNetProfit: totalRevenue - totalExpenses,
    completedJobsCount: completedJobs,
    expensesByCategory: expensesByCategory.map((r) => ({
      category: r.category,
      total: r._sum.amount?.toNumber() ?? 0,
    })),
  };
}
