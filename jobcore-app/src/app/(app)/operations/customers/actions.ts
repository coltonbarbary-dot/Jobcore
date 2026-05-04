"use server";

import { requireOrg } from "@/lib/auth";
import {
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "@/lib/services/customers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type ActionState = { error?: string };

export async function createCustomerAction(
  _: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { user, org } = await requireOrg();

  const fullName = (formData.get("fullName") as string)?.trim();
  if (!fullName) return { error: "Full name is required" };

  const address = {
    street: (formData.get("street") as string)?.trim() || undefined,
    city: (formData.get("city") as string)?.trim() || undefined,
    state: (formData.get("state") as string)?.trim() || undefined,
    zip: (formData.get("zip") as string)?.trim() || undefined,
  };
  const hasAddress = Object.values(address).some(Boolean);

  let customerId: string;
  try {
    const customer = await createCustomer(org.id, user.id, {
      fullName,
      email: (formData.get("email") as string)?.trim() || undefined,
      phone: (formData.get("phone") as string)?.trim() || undefined,
      companyName: (formData.get("companyName") as string)?.trim() || undefined,
      billingAddress: hasAddress ? address : undefined,
      notes: (formData.get("notes") as string)?.trim() || undefined,
    });
    customerId = customer.id;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create customer" };
  }

  revalidatePath("/operations/customers");
  revalidatePath("/dashboard");
  redirect(`/operations/customers/${customerId}`);
}

export async function updateCustomerAction(
  customerId: string,
  _: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { user, org } = await requireOrg();

  const fullName = (formData.get("fullName") as string)?.trim();
  if (!fullName) return { error: "Full name is required" };

  const address = {
    street: (formData.get("street") as string)?.trim() || undefined,
    city: (formData.get("city") as string)?.trim() || undefined,
    state: (formData.get("state") as string)?.trim() || undefined,
    zip: (formData.get("zip") as string)?.trim() || undefined,
  };
  const hasAddress = Object.values(address).some(Boolean);

  try {
    await updateCustomer(org.id, user.id, customerId, {
      fullName,
      email: (formData.get("email") as string)?.trim() || undefined,
      phone: (formData.get("phone") as string)?.trim() || undefined,
      companyName: (formData.get("companyName") as string)?.trim() || undefined,
      billingAddress: hasAddress ? address : undefined,
      notes: (formData.get("notes") as string)?.trim() || undefined,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update customer" };
  }

  revalidatePath(`/operations/customers/${customerId}`);
  revalidatePath("/operations/customers");
  redirect(`/operations/customers/${customerId}`);
}

export async function deleteCustomerAction(customerId: string): Promise<{ error?: string }> {
  const { user, org } = await requireOrg();

  try {
    await deleteCustomer(org.id, user.id, customerId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete customer" };
  }

  revalidatePath("/operations/customers");
  revalidatePath("/dashboard");
  redirect("/operations/customers");
}
