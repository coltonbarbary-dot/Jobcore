"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TopbarProps {
  title: string;
  onMenuToggle: () => void;
}

export function Topbar({ title, onMenuToggle }: TopbarProps) {
  return (
    <header className="flex h-14 items-center gap-4 border-b border-[#e5e7eb] bg-white px-4 md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onMenuToggle}
        aria-label="Toggle menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <h1 className="text-sm font-semibold text-[#0a0a0a]">{title}</h1>
    </header>
  );
}
