import { notFound } from "next/navigation";
import Link from "next/link";
import { requireOrg } from "@/lib/auth";
import { getCustomer } from "@/lib/services/customers";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { CustomerForm } from "@/components/operations/customers/customer-form";
import { updateCustomerAction } from "../../actions";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { org } = await requireOrg();
  const customer = await getCustomer(org.id, id);
  if (!customer) notFound();

  const boundAction = updateCustomerAction.bind(null, id);

  return (
    <PageShell
      title={`Edit: ${customer.fullName}`}
      action={
        <Button variant="secondary" size="sm" asChild>
          <Link href={`/operations/customers/${id}`}>Cancel</Link>
        </Button>
      }
    >
      <CustomerForm
        action={boundAction}
        defaultValues={customer}
        submitLabel="Save Changes"
      />
    </PageShell>
  );
}
