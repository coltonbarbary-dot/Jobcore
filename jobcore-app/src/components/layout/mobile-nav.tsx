"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "./sidebar";

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  orgName: string;
  userInitials: string;
  userEmail: string;
  onSignOut: () => void;
}

export function MobileNav({ open, onClose, orgName, userInitials, userEmail, onSignOut }: MobileNavProps) {
  // Close on escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Drawer */}
      <div className="absolute left-0 top-0 h-full w-64 bg-[#0a0a0a] shadow-xl">
        <div className="absolute right-3 top-3">
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-[#1f2937]">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Sidebar
          orgName={orgName}
          userInitials={userInitials}
          userEmail={userEmail}
          onSignOut={onSignOut}
        />
      </div>
    </div>
  );
}
