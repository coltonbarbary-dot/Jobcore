import Link from "next/link";
import { requireOrg } from "@/lib/auth";
import { listCustomers } from "@/lib/services/customers";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { JobForm } from "@/components/operations/jobs/job-form";
import { createJobAction } from "../actions";

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  const { customerId } = await searchParams;
  const { org } = await requireOrg();
  const customers = await listCustomers(org.id);

  return (
    <PageShell
      title="New Job"
      action={
        <Button variant="secondary" size="sm" asChild>
          <Link href="/operations/jobs">Cancel</Link>
        </Button>
      }
    >
      <JobForm
        action={createJobAction}
        customers={customers.map((c) => ({ id: c.id, fullName: c.fullName }))}
        defaultCustomerId={customerId}
        submitLabel="Create Job"
      />
    </PageShell>
  );
}
