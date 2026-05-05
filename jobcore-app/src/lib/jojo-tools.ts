/**
 * JoJo tool definitions for OpenAI function-calling.
 * Each tool maps 1:1 to a service layer function — no separate implementations.
 */

import type { ChatCompletionTool } from "openai/resources/chat/completions";
import { createCustomer, listCustomers } from "./services/customers";
import { createLead, listLeads } from "./services/leads";
import { createJob, listJobs, updateJob } from "./services/jobs";
import { createEstimate } from "./services/estimates";
import { createInvoice } from "./services/invoices";
import { db } from "./db";
import { suggestScheduleForJob } from "./jojo-scheduler";

// ─── Tool schemas ─────────────────────────────────────────────────────────────

export const JOJO_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_customers",
      description: "List customers for this organization. Use to answer questions about customers or to find a customer ID before creating a job/estimate/invoice.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Optional name/email substring to filter by" },
          limit: { type: "number", description: "Max records to return (default 20, max 50)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_jobs",
      description: "List jobs for this organization. Use to answer questions about scheduled or ongoing work.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Max records to return (default 20, max 50)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_leads",
      description: "List leads for this organization.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Max records to return (default 20, max 50)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_business_summary",
      description: "Get a high-level summary of the business: counts of customers, jobs (by status), open leads, draft/sent invoices, and total revenue from paid invoices.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "create_customer",
      description: "Create a new customer record.",
      parameters: {
        type: "object",
        properties: {
          fullName: { type: "string", description: "Customer full name (required)" },
          email: { type: "string", description: "Email address" },
          phone: { type: "string", description: "Phone number" },
          companyName: { type: "string", description: "Company or business name" },
          notes: { type: "string", description: "Internal notes" },
        },
        required: ["fullName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_lead",
      description: "Create a new lead record to track a potential job opportunity.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Short description of the lead (required)" },
          source: { type: "string", description: "Where this lead came from (e.g. referral, website)" },
          customerId: { type: "string", description: "Existing customer ID to link, if known" },
          description: { type: "string", description: "Longer description of the opportunity" },
          budgetEstimate: { type: "number", description: "Rough budget in dollars" },
          notes: { type: "string", description: "Internal notes" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_job",
      description: "Create a new job record for a customer.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Job title (required)" },
          customerId: { type: "string", description: "Customer ID this job belongs to (required)" },
          description: { type: "string", description: "Job description" },
          jobType: { type: "string", description: "Type of job (e.g. Installation, Repair)" },
          scheduledStart: { type: "string", description: "ISO 8601 datetime for scheduled start" },
          scheduledEnd: { type: "string", description: "ISO 8601 datetime for scheduled end" },
          notes: { type: "string", description: "Internal notes" },
        },
        required: ["title", "customerId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_estimate",
      description: "Create a new draft estimate for a customer.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Estimate title (required)" },
          customerId: { type: "string", description: "Customer ID (required)" },
          notes: { type: "string", description: "Notes shown on the estimate" },
          items: {
            type: "array",
            description: "Line items",
            items: {
              type: "object",
              properties: {
                description: { type: "string" },
                quantity: { type: "number" },
                unitPrice: { type: "number" },
              },
              required: ["description", "quantity", "unitPrice"],
            },
          },
        },
        required: ["title", "customerId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_invoice",
      description: "Create a new draft invoice for a customer.",
      parameters: {
        type: "object",
        properties: {
          customerId: { type: "string", description: "Customer ID (required)" },
          jobId: { type: "string", description: "Job ID to link, if applicable" },
          notes: { type: "string", description: "Notes shown on the invoice" },
          items: {
            type: "array",
            description: "Line items",
            items: {
              type: "object",
              properties: {
                description: { type: "string" },
                quantity: { type: "number" },
                unitPrice: { type: "number" },
              },
              required: ["description", "quantity", "unitPrice"],
            },
          },
        },
        required: ["customerId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_schedule",
      description: "Analyze the contractor's existing calendar and suggest the best available date and time to schedule a specific job. Always call this before suggesting any schedule to the user. Never auto-schedule — only suggest.",
      parameters: {
        type: "object",
        properties: {
          jobId: { type: "string", description: "ID of the job to schedule (required)" },
          durationMinutes: { type: "number", description: "How long the job takes in minutes. If not provided, inferred from job data or defaults to 120." },
          preferredDate: { type: "string", description: "ISO date string (YYYY-MM-DD) if the customer has a preferred date. Optional." },
        },
        required: ["jobId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "approve_schedule",
      description: "Book the suggested schedule slot for a job ONLY after the user has explicitly confirmed they want to proceed. This updates scheduledStart, scheduledEnd, and sets status=scheduled. Do NOT call this unless the user has said yes to a specific slot.",
      parameters: {
        type: "object",
        properties: {
          jobId: { type: "string", description: "Job ID to update (required)" },
          scheduledStart: { type: "string", description: "ISO 8601 datetime for the confirmed start time (required)" },
          scheduledEnd: { type: "string", description: "ISO 8601 datetime for the confirmed end time (required)" },
        },
        required: ["jobId", "scheduledStart", "scheduledEnd"],
      },
    },
  },
];

// ─── Structured tool result type ──────────────────────────────────────────────

export type ToolResult = {
  success: boolean;
  action: string;
  entityType?: string;
  entityId?: string;
  data?: object;
  error?: string;
};

// ─── Tool executor ────────────────────────────────────────────────────────────

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  context: { organizationId: string; actorId: string }
): Promise<ToolResult> {
  const { organizationId, actorId } = context;

  try {
    switch (name) {
      case "list_customers": {
        const limit = Math.min(Number(args.limit ?? 20), 50);
        const customers = await listCustomers(organizationId, { limit });
        const search = typeof args.search === "string" ? args.search.toLowerCase() : null;
        const filtered = search
          ? customers.filter(
              (c) =>
                c.fullName.toLowerCase().includes(search) ||
                (c.email ?? "").toLowerCase().includes(search)
            )
          : customers;
        return {
          success: true,
          action: "list_customers",
          entityType: "customer",
          data: {
            count: filtered.length,
            customers: filtered.slice(0, limit).map((c) => ({
              id: c.id,
              fullName: c.fullName,
              email: c.email,
              phone: c.phone,
              companyName: c.companyName,
              jobCount: c._count.jobs,
            })),
          },
        };
      }

      case "list_jobs": {
        const limit = Math.min(Number(args.limit ?? 20), 50);
        const jobs = await listJobs(organizationId, { limit });
        return {
          success: true,
          action: "list_jobs",
          entityType: "job",
          data: {
            count: jobs.length,
            jobs: jobs.map((j) => ({
              id: j.id,
              title: j.title,
              status: j.status,
              customerName: j.customer.fullName,
              scheduledStart: j.scheduledStart,
              totalAmount: Number(j.totalAmount),
            })),
          },
        };
      }

      case "list_leads": {
        const limit = Math.min(Number(args.limit ?? 20), 50);
        const leads = await listLeads(organizationId, { limit });
        return {
          success: true,
          action: "list_leads",
          entityType: "lead",
          data: {
            count: leads.length,
            leads: leads.map((l) => ({
              id: l.id,
              title: l.title,
              status: l.status,
              source: l.source,
              budgetEstimate: l.budgetEstimate ? Number(l.budgetEstimate) : null,
            })),
          },
        };
      }

      case "get_business_summary": {
        const [customerCount, jobStats, leadStats, invoiceStats] = await Promise.all([
          db.customer.count({ where: { organizationId } }),
          db.job.groupBy({
            by: ["status"],
            where: { organizationId },
            _count: { id: true },
          }),
          db.lead.groupBy({
            by: ["status"],
            where: { organizationId },
            _count: { id: true },
          }),
          db.invoice.groupBy({
            by: ["status"],
            where: { organizationId },
            _count: { id: true },
            _sum: { total: true },
          }),
        ]);

        const jobByStatus: Record<string, number> = {};
        for (const row of jobStats) jobByStatus[row.status] = row._count.id;

        const leadByStatus: Record<string, number> = {};
        for (const row of leadStats) leadByStatus[row.status] = row._count.id;

        const paidRevenue =
          invoiceStats.find((r) => r.status === "paid")?._sum.total ?? 0;

        return {
          success: true,
          action: "get_business_summary",
          data: {
            customers: customerCount,
            jobs: jobByStatus,
            leads: leadByStatus,
            invoices: Object.fromEntries(
              invoiceStats.map((r) => [r.status, r._count.id])
            ),
            paidRevenueDollars: Number(paidRevenue),
          },
        };
      }

      case "create_customer": {
        const customer = await createCustomer(organizationId, actorId, {
          fullName: String(args.fullName),
          email: args.email ? String(args.email) : undefined,
          phone: args.phone ? String(args.phone) : undefined,
          companyName: args.companyName ? String(args.companyName) : undefined,
          notes: args.notes ? String(args.notes) : undefined,
        });
        return {
          success: true,
          action: "create_customer",
          entityType: "customer",
          entityId: customer.id,
          data: { id: customer.id, fullName: customer.fullName, email: customer.email },
        };
      }

      case "create_lead": {
        const lead = await createLead(organizationId, actorId, {
          title: String(args.title),
          source: args.source ? String(args.source) : undefined,
          customerId: args.customerId ? String(args.customerId) : undefined,
          description: args.description ? String(args.description) : undefined,
          budgetEstimate: args.budgetEstimate ? Number(args.budgetEstimate) : undefined,
          notes: args.notes ? String(args.notes) : undefined,
        });
        return {
          success: true,
          action: "create_lead",
          entityType: "lead",
          entityId: lead.id,
          data: { id: lead.id, title: lead.title, status: lead.status },
        };
      }

      case "create_job": {
        const job = await createJob(organizationId, actorId, {
          title: String(args.title),
          customerId: String(args.customerId),
          description: args.description ? String(args.description) : undefined,
          jobType: args.jobType ? String(args.jobType) : undefined,
          scheduledStart: args.scheduledStart ? new Date(String(args.scheduledStart)) : undefined,
          scheduledEnd: args.scheduledEnd ? new Date(String(args.scheduledEnd)) : undefined,
          notes: args.notes ? String(args.notes) : undefined,
          status: "scheduled",
        });
        return {
          success: true,
          action: "create_job",
          entityType: "job",
          entityId: job.id,
          data: { id: job.id, title: job.title, status: job.status },
        };
      }

      case "create_estimate": {
        const items = Array.isArray(args.items)
          ? (args.items as Array<{ description: string; quantity: number; unitPrice: number }>)
          : [];
        const estimate = await createEstimate(organizationId, actorId, {
          title: String(args.title),
          customerId: String(args.customerId),
          notes: args.notes ? String(args.notes) : undefined,
          items,
        });
        return {
          success: true,
          action: "create_estimate",
          entityType: "estimate",
          entityId: estimate.id,
          data: { id: estimate.id, estimateNumber: estimate.estimateNumber, status: estimate.status },
        };
      }

      case "create_invoice": {
        const items = Array.isArray(args.items)
          ? (args.items as Array<{ description: string; quantity: number; unitPrice: number }>)
          : [];
        const invoice = await createInvoice(organizationId, actorId, {
          customerId: String(args.customerId),
          jobId: args.jobId ? String(args.jobId) : undefined,
          notes: args.notes ? String(args.notes) : undefined,
          items,
        });
        return {
          success: true,
          action: "create_invoice",
          entityType: "invoice",
          entityId: invoice.id,
          data: {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            status: invoice.status,
            total: Number(invoice.total),
          },
        };
      }

      case "suggest_schedule": {
        const jobId = String(args.jobId);
        const durationMinutes = args.durationMinutes ? Number(args.durationMinutes) : undefined;
        const preferredDate = args.preferredDate ? new Date(String(args.preferredDate)) : undefined;

        const suggestion = await suggestScheduleForJob(
          organizationId,
          jobId,
          durationMinutes,
          preferredDate
        );

        if (!suggestion) {
          return {
            success: false,
            action: "suggest_schedule",
            error: "No available slots found in the next 30 business days, or job not found.",
          };
        }

        return {
          success: true,
          action: "suggest_schedule",
          entityType: "job",
          entityId: jobId,
          data: suggestion,
        };
      }

      case "approve_schedule": {
        const jobId = String(args.jobId);
        const scheduledStart = new Date(String(args.scheduledStart));
        const scheduledEnd = new Date(String(args.scheduledEnd));

        if (isNaN(scheduledStart.getTime()) || isNaN(scheduledEnd.getTime())) {
          return { success: false, action: "approve_schedule", error: "Invalid date format for scheduledStart or scheduledEnd." };
        }

        const job = await updateJob(organizationId, actorId, jobId, {
          scheduledStart,
          scheduledEnd,
          status: "scheduled",
        });

        return {
          success: true,
          action: "approve_schedule",
          entityType: "job",
          entityId: job.id,
          data: {
            id: job.id,
            title: job.title,
            scheduledStart: job.scheduledStart,
            scheduledEnd: job.scheduledEnd,
            status: job.status,
          },
        };
      }

      default:
        return { success: false, action: name, error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, action: name, error: message };
  }
}
