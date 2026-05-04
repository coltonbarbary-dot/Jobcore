import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { organization: true },
  });

  // No org yet — push to onboarding (unless already there)
  if (!user || !user.organization) {
    redirect("/onboarding");
  }

  if (!user.organization.onboardingComplete) {
    redirect("/onboarding");
  }

  const initials = user.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || user.email.slice(0, 2).toUpperCase();

  return (
    <AppShell
      orgName={user.organization.name}
      userInitials={initials}
      userEmail={user.email}
    >
      {children}
    </AppShell>
  );
}
