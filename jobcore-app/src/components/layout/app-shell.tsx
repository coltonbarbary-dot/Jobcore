"use client";

import { useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";

interface AppShellProps {
  children: React.ReactNode;
  orgName: string;
  userInitials: string;
  userEmail: string;
}

export function AppShell({ children, orgName, userInitials, userEmail }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { signOut } = useClerk();
  const router = useRouter();

  const handleSignOut = () => {
    signOut(() => router.push("/sign-in"));
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar
          orgName={orgName}
          userInitials={userInitials}
          userEmail={userEmail}
          onSignOut={handleSignOut}
        />
      </div>

      {/* Mobile Nav */}
      <MobileNav
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        orgName={orgName}
        userInitials={userInitials}
        userEmail={userEmail}
        onSignOut={handleSignOut}
      />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile topbar header — only visible on mobile */}
        <header className="flex h-14 items-center gap-4 border-b border-[#e5e7eb] bg-white px-4 md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[#6b7280] hover:bg-[#f9fafb] hover:text-[#0a0a0a] transition-colors"
            aria-label="Open menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-[#0a0a0a]">
              <span className="text-[10px] font-bold text-white">JC</span>
            </div>
            <span className="text-sm font-semibold text-[#0a0a0a]">JobCore</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[#f9fafb]">
          {children}
        </main>
      </div>
    </div>
  );
}
