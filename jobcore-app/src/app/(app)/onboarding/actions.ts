"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export async function completeOnboarding(formData: {
  businessName: string;
  businessType: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { organization: true },
  });

  if (!user?.organization) throw new Error("No organization found");

  await db.organization.update({
    where: { id: user.organization.id },
    data: {
      name: formData.businessName.trim(),
      businessType: formData.businessType.trim(),
      phone: formData.phone.trim(),
      address: {
        street: formData.street.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        zip: formData.zip.trim(),
      },
      onboardingComplete: true,
    },
  });

  redirect("/dashboard");
}
