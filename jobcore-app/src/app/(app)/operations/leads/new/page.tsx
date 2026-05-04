import Link from "next/link";
import { requireOrg } from "@/lib/auth";
import { listCustomers } from "@/lib/services/customers";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { LeadForm } from "@/components/operations/leads/lead-form";
import { createLeadAction } from "../actions";

export default async function NewLeadPage() {
  const { org } = await requireOrg();
  const customers = await listCustomers(org.id);

  return (
    <PageShell
      title="New Lead"
      action={
        <Button variant="secondary" size="sm" asChild>
          <Link href="/operations/leads">Cancel</Link>
        </Button>
      }
    >
      <LeadForm
        action={createLeadAction}
        customers={customers.map((c) => ({ id: c.id, fullName: c.fullName }))}
        submitLabel="Create Lead"
      />
    </PageShell>
  );
}
