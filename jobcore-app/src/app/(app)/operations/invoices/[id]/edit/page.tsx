import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireOrg } from "@/lib/auth";
import { getInvoice } from "@/lib/services/invoices";
import { listCustomers } from "@/lib/services/customers";
import { listJobs } from "@/lib/services/jobs";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { InvoiceForm } from "@/components/operations/invoices/invoice-form";
import { updateInvoiceAction } from "../../actions";

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { org } = await requireOrg();

  const invoice = await getInvoice(org.id, id);
  if (!invoice) notFound();

  if (invoice.status === "paid" || invoice.status === "void") {
    redirect(`/operations/invoices/${id}`);
  }

  const [customers, jobs] = await Promise.all([
    listCustomers(org.id),
    listJobs(org.id, { limit: 200 }),
  ]);

  const action = updateInvoiceAction.bind(null, id);

  return (
    <PageShell
      title={`Edit ${invoice.invoiceNumber}`}
      action={
        <Button variant="secondary" size="sm" asChild>
          <Link href={`/operations/invoices/${id}`}>Cancel</Link>
        </Button>
      }
    >
      <InvoiceForm
        action={action}
        defaultValues={{ ...invoice, items: invoice.items }}
        customers={customers.map((c) => ({ id: c.id, fullName: c.fullName }))}
        jobs={jobs.map((j) => ({ id: j.id, title: j.title }))}
        submitLabel="Save Changes"
      />
    </PageShell>
  );
}
