import Link from "next/link";
import { requireOrg } from "@/lib/auth";
import { listCustomers } from "@/lib/services/customers";
import { listJobs } from "@/lib/services/jobs";
import { getJob } from "@/lib/services/jobs";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { InvoiceForm } from "@/components/operations/invoices/invoice-form";
import { createInvoiceAction } from "../actions";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; jobId?: string }>;
}) {
  const { customerId, jobId } = await searchParams;
  const { org } = await requireOrg();

  const [customers, jobs] = await Promise.all([
    listCustomers(org.id),
    listJobs(org.id, { limit: 200 }),
  ]);

  // Pre-fill customer from job if jobId provided
  let resolvedCustomerId = customerId;
  if (jobId && !customerId) {
    const job = await getJob(org.id, jobId);
    if (job) resolvedCustomerId = job.customerId;
  }

  return (
    <PageShell
      title="New Invoice"
      action={
        <Button variant="secondary" size="sm" asChild>
          <Link href="/operations/invoices">Cancel</Link>
        </Button>
      }
    >
      <InvoiceForm
        action={createInvoiceAction}
        customers={customers.map((c) => ({ id: c.id, fullName: c.fullName }))}
        jobs={jobs.map((j) => ({ id: j.id, title: j.title }))}
        defaultCustomerId={resolvedCustomerId}
        defaultJobId={jobId}
        submitLabel="Create Invoice"
      />
    </PageShell>
  );
}
