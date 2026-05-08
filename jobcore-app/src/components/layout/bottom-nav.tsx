"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wrench,
  Calendar,
  Wallet,
  Sparkles,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Dashboard", href: "/dashboard",          icon: LayoutDashboard, match: "/dashboard" },
  { label: "Operations", href: "/operations/jobs",   icon: Wrench,          match: "/operations" },
  { label: "Calendar",   href: "/calendar",          icon: Calendar,        match: "/calendar" },
  { label: "Financials", href: "/financials/expenses", icon: Wallet,        match: "/financials" },
  { label: "JoJo",       href: "/jojo",              icon: Sparkles,        match: "/jojo" },
  { label: "Settings",   href: "/settings",          icon: Settings,        match: "/settings" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden shrink-0 border-t border-[#e5e7eb] bg-white">
      <div className="flex items-center justify-around h-16">
        {TABS.map((tab) => {
          const active =
            pathname === tab.match ||
            pathname.startsWith(tab.match + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center gap-0.5 flex-1 py-2",
                active ? "text-[#0a0a0a]" : "text-[#9ca3af]"
              )}
            >
              <tab.icon
                className={cn("h-5 w-5 shrink-0", active && "stroke-[2.5]")}
              />
              <span
                className={cn(
                  "text-[10px] leading-tight",
                  active ? "font-semibold" : "font-normal"
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
