"use client";

import Link from "next/link";
import { Bell, ChevronDown, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = ["Discover", "My Capabilities", "Analytics", "Community", "Docs"] as const;

export function HubHeader({ className }: { className?: string }) {
  return (
    <header
      className={cn(
        "flex h-14 shrink-0 items-center justify-between border-b border-[#E2E8F0] bg-white px-4 lg:px-6",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-6">
        <Link href="/hub" className="text-[15px] font-bold tracking-tight text-[#6366F1]">
          Rimvio Hub
        </Link>
        <nav className="hidden items-center gap-4 md:flex">
          {NAV.map((item) => (
            <Link
              key={item}
              href="/hub"
              className="text-[13px] font-medium text-[#64748B] transition-colors hover:text-[#0F172A]"
            >
              {item}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F8FAFC]"
          aria-label="Notifications"
        >
          <Bell className="size-4" />
        </button>
        <button
          type="button"
          className="hidden size-9 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F8FAFC] sm:flex"
          aria-label="Help"
        >
          <HelpCircle className="size-4" />
        </button>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] px-2 py-1.5 text-left hover:bg-[#F8FAFC]"
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-[#6366F1] text-[11px] font-bold text-white">
            D
          </span>
          <span className="hidden text-[12px] font-medium text-[#0F172A] sm:block">
            Dev_Studio
          </span>
          <span className="hidden rounded bg-[#EEF2FF] px-1.5 py-0.5 text-[9px] font-bold text-[#6366F1] sm:inline">
            PRO
          </span>
          <ChevronDown className="size-3.5 text-[#94A3B8]" />
        </button>
      </div>
    </header>
  );
}
