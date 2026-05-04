import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { CustomerForm } from "@/components/operations/customers/customer-form";
import { createCustomerAction } from "../actions";

export default function NewCustomerPage() {
  return (
    <PageShell
      title="New Customer"
      action={
        <Button variant="secondary" size="sm" asChild>
          <Link href="/operations/customers">Cancel</Link>
        </Button>
      }
    >
      <CustomerForm action={createCustomerAction} submitLabel="Create Customer" />
    </PageShell>
  );
}
