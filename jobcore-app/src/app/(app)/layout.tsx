import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { AppShell } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { organization: true },
  });

  if (!user || !user.organization || !user.organization.onboardingComplete) {
    redirect("/onboarding");
  }

  const nameParts = user.fullName.trim().split(/\s+/).filter(Boolean);
  const initials = (
    nameParts.length >= 2
      ? nameParts[0][0] + nameParts[nameParts.length - 1][0]
      : nameParts.length === 1
      ? nameParts[0].slice(0, 2)
      : user.email.slice(0, 2)
  ).toUpperCase() || "??";

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
