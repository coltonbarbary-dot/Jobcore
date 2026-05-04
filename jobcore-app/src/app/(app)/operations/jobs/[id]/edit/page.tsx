import { notFound } from "next/navigation";
import Link from "next/link";
import { requireOrg } from "@/lib/auth";
import { getJob } from "@/lib/services/jobs";
import { listCustomers } from "@/lib/services/customers";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { JobForm } from "@/components/operations/jobs/job-form";
import { updateJobAction } from "../../actions";

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { org } = await requireOrg();
  const [job, customers] = await Promise.all([getJob(org.id, id), listCustomers(org.id)]);
  if (!job) notFound();

  const boundAction = updateJobAction.bind(null, id);

  return (
    <PageShell
      title={`Edit: ${job.title}`}
      action={
        <Button variant="secondary" size="sm" asChild>
          <Link href={`/operations/jobs/${id}`}>Cancel</Link>
        </Button>
      }
    >
      <JobForm
        action={boundAction}
        defaultValues={{ ...job, items: job.items }}
        customers={customers.map((c) => ({ id: c.id, fullName: c.fullName }))}
        submitLabel="Save Changes"
      />
    </PageShell>
  );
}
