"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";

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

  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error("Unauthorized");

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
  const fullName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    email.split("@")[0] ||
    "User";

  const existingUser = await db.user.findUnique({
    where: { id: userId },
    include: { organization: true },
  });

  if (!existingUser?.organization) {
    // Webhook hasn't fired (or wasn't configured) — provision org + user now.
    const orgName = formData.businessName.trim() || "My Business";
    const slugBase = orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const slug = `${slugBase || "org"}-${randomUUID().slice(0, 6)}`;

    const org = await db.organization.create({
      data: {
        clerkOrganizationId: `personal_${userId}`,
        name: orgName,
        slug,
        ownerId: userId,
        businessType: formData.businessType.trim() || null,
        phone: formData.phone.trim() || null,
        address: {
          street: formData.street.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          zip: formData.zip.trim(),
        },
        onboardingComplete: true,
      },
    });

    await db.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        organizationId: org.id,
        email,
        fullName,
        role: "owner",
      },
      update: {
        organizationId: org.id,
        email,
        fullName,
      },
    });
  } else {
    // Org already exists (webhook fired) — update details and mark complete.
    await db.organization.update({
      where: { id: existingUser.organization.id },
      data: {
        name: formData.businessName.trim(),
        businessType: formData.businessType.trim() || null,
        phone: formData.phone.trim() || null,
        address: {
          street: formData.street.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          zip: formData.zip.trim(),
        },
        onboardingComplete: true,
      },
    });

    await db.user.update({
      where: { id: userId },
      data: { email, fullName },
    });
  }

  redirect("/dashboard");
}
