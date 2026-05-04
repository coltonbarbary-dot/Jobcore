import { notFound } from "next/navigation";
import Link from "next/link";
import { requireOrg } from "@/lib/auth";
import { getEstimate } from "@/lib/services/estimates";
import { listCustomers } from "@/lib/services/customers";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { EstimateForm } from "@/components/operations/estimates/estimate-form";
import { updateEstimateAction } from "../../actions";

export default async function EditEstimatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { org } = await requireOrg();
  const [estimate, customers] = await Promise.all([getEstimate(org.id, id), listCustomers(org.id)]);
  if (!estimate) notFound();
  if (estimate.status === "approved" || estimate.status === "declined") notFound();

  const boundAction = updateEstimateAction.bind(null, id);

  return (
    <PageShell
      title={`Edit: ${estimate.estimateNumber}`}
      action={
        <Button variant="secondary" size="sm" asChild>
          <Link href={`/operations/estimates/${id}`}>Cancel</Link>
        </Button>
      }
    >
      <EstimateForm
        action={boundAction}
        defaultValues={{ ...estimate, items: estimate.items }}
        customers={customers.map((c) => ({ id: c.id, fullName: c.fullName }))}
        submitLabel="Save Changes"
      />
    </PageShell>
  );
}
