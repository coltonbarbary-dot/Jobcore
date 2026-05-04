import { notFound } from "next/navigation";
import Link from "next/link";
import { requireOrg } from "@/lib/auth";
import { getLead } from "@/lib/services/leads";
import { listCustomers } from "@/lib/services/customers";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { LeadForm } from "@/components/operations/leads/lead-form";
import { updateLeadAction } from "../../actions";

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { org } = await requireOrg();
  const [lead, customers] = await Promise.all([getLead(org.id, id), listCustomers(org.id)]);
  if (!lead) notFound();

  const boundAction = updateLeadAction.bind(null, id);

  return (
    <PageShell
      title={`Edit: ${lead.title}`}
      action={
        <Button variant="secondary" size="sm" asChild>
          <Link href={`/operations/leads/${id}`}>Cancel</Link>
        </Button>
      }
    >
      <LeadForm
        action={boundAction}
        defaultValues={lead}
        customers={customers.map((c) => ({ id: c.id, fullName: c.fullName }))}
        submitLabel="Save Changes"
      />
    </PageShell>
  );
}
