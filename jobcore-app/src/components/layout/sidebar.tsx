"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  Calendar,
  Wallet,
  FolderOpen,
  Sparkles,
  Settings,
  ChevronDown,
  ChevronRight,
  Users,
  FileText,
  ClipboardList,
  UserCheck,
  Receipt,
  TrendingUp,
  BarChart2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

type NavItem = {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
};

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Operations",
    icon: Briefcase,
    children: [
      { label: "Leads",     href: "/operations/leads",     icon: UserCheck },
      { label: "Customers", href: "/operations/customers", icon: Users },
      { label: "Jobs",      href: "/operations/jobs",      icon: ClipboardList },
      { label: "Estimates", href: "/operations/estimates", icon: FileText },
      { label: "Invoices",  href: "/operations/invoices",  icon: Receipt },
    ],
  },
  {
    label: "Calendar",
    href: "/calendar",
    icon: Calendar,
  },
  {
    label: "Financials",
    icon: Wallet,
    children: [
      { label: "Expenses", href: "/financials/expenses", icon: TrendingUp },
      { label: "Reports",  href: "/financials/reports",  icon: BarChart2 },
    ],
  },
  {
    label: "Files",
    href: "/files",
    icon: FolderOpen,
  },
  {
    label: "JoJo",
    href: "/jojo",
    icon: Sparkles,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

function NavGroup({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const isActive = item.children?.some((c) => c.href && pathname.startsWith(c.href));
  const [open, setOpen] = useState(isActive ?? false);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
          isActive
            ? "bg-[#f3f4f6] text-[#0a0a0a] font-medium"
            : "text-[#6b7280] hover:bg-[#f9fafb] hover:text-[#0a0a0a]"
        )}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        {open ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
      </button>
      {open && (
        <div className="mt-1 ml-3 border-l border-[#e5e7eb] pl-3 space-y-0.5">
          {item.children?.map((child) => {
            const active = pathname.startsWith(child.href);
            return (
              <Link
                key={child.label}
                href={child.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-[#f3f4f6] text-[#0a0a0a] font-medium"
                    : "text-[#6b7280] hover:bg-[#f9fafb] hover:text-[#0a0a0a]"
                )}
              >
                <child.icon className="h-3.5 w-3.5 shrink-0" />
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface SidebarProps {
  orgName: string;
  userInitials: string;
  userEmail: string;
  onSignOut: () => void;
}

export function Sidebar({ orgName, userInitials, userEmail, onSignOut }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col bg-white border-r border-[#e5e7eb]">
      {/* Logo + Org */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[#e5e7eb]">
        <div className="flex h-7 w-7 items-center justify-center rounded bg-[#0a0a0a]">
          <span className="text-xs font-bold text-white">JC</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#0a0a0a] truncate">{orgName}</p>
          <p className="text-xs text-[#9ca3af]">JobCore</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          if (item.children) {
            return <NavGroup key={item.label} item={item} />;
          }

          const active =
            item.href
              ? pathname === item.href || pathname.startsWith(item.href + "/")
              : false;

          return (
            <Link
              key={item.label}
              href={item.href!}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-[#f3f4f6] text-[#0a0a0a] font-medium"
                  : "text-[#6b7280] hover:bg-[#f9fafb] hover:text-[#0a0a0a]"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-[#e5e7eb] p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f3f4f6] text-xs font-semibold text-[#0a0a0a] shrink-0">
            {userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[#0a0a0a] truncate">{userEmail}</p>
          </div>
          <button
            onClick={onSignOut}
            className="text-xs text-[#9ca3af] hover:text-[#0a0a0a] transition-colors"
          >
            Out
          </button>
        </div>
      </div>
    </aside>
  );
}
