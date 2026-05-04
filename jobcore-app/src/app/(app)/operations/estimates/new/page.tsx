import Link from "next/link";
import { requireOrg } from "@/lib/auth";
import { listCustomers } from "@/lib/services/customers";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { EstimateForm } from "@/components/operations/estimates/estimate-form";
import { createEstimateAction } from "../actions";

export default async function NewEstimatePage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  const { customerId } = await searchParams;
  const { org } = await requireOrg();
  const customers = await listCustomers(org.id);

  return (
    <PageShell
      title="New Estimate"
      action={
        <Button variant="secondary" size="sm" asChild>
          <Link href="/operations/estimates">Cancel</Link>
        </Button>
      }
    >
      <EstimateForm
        action={createEstimateAction}
        customers={customers.map((c) => ({ id: c.id, fullName: c.fullName }))}
        defaultCustomerId={customerId}
        submitLabel="Create Estimate"
      />
    </PageShell>
  );
}
