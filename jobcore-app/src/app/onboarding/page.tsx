export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export default async function OnboardingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { organization: true },
  });

  if (user?.organization?.onboardingComplete) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f9fafb] p-4">
      <OnboardingWizard
        userId={userId}
        orgId={user?.organization?.id ?? null}
        orgName={user?.organization?.name ?? ""}
      />
    </div>
  );
}
