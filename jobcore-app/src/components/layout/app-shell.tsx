"use client";

import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";

interface AppShellProps {
  children: React.ReactNode;
  orgName: string;
  userInitials: string;
  userEmail: string;
}

export function AppShell({ children, orgName, userInitials, userEmail }: AppShellProps) {
  const { signOut } = useClerk();
  const router = useRouter();

  const handleSignOut = () => {
    signOut(() => router.push("/sign-in"));
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar
          orgName={orgName}
          userInitials={userInitials}
          userEmail={userEmail}
          onSignOut={handleSignOut}
        />
      </div>

      {/* Right column: scrollable content + bottom nav */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-[#f9fafb]">
          {children}
        </main>

        {/* Mobile bottom nav — sits below main, never overlaps content */}
        <BottomNav />
      </div>
    </div>
  );
}
