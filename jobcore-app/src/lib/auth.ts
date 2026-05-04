import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) return null;

  return db.user.findUnique({ where: { id: userId } });
}

export async function getCurrentOrg() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { organization: true },
  });

  return user?.organization ?? null;
}

export async function requireAuth() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return userId;
}

export async function requireOrg() {
  const userId = await requireAuth();

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { organization: true },
  });

  if (!user || !user.organization) {
    redirect("/onboarding");
  }

  if (!user.organization.onboardingComplete) {
    redirect("/onboarding");
  }

  return { user, org: user.organization };
}

// Called from Clerk webhook to sync user into local DB
export async function syncClerkUser(clerkUserId: string) {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
  const fullName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ");
  const avatarUrl = clerkUser.imageUrl;

  const existingUser = await db.user.findUnique({ where: { id: clerkUserId } });
  if (existingUser) {
    return db.user.update({
      where: { id: clerkUserId },
      data: { email, fullName, avatarUrl },
    });
  }

  return null;
}
