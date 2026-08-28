"use client";

import { Bell, ChevronDown, HelpCircle } from "lucide-react";
import { AutosaveStatusBar } from "@/components/hub/wizard/wizard-footer";
import type { AutosaveStatus } from "@/lib/hub/capability/types";
import { cn } from "@/lib/utils";

export function HubHeader({
  className,
  autosaveStatus,
  lastSavedAt,
  onRetryAutosave,
}: {
  className?: string;
  autosaveStatus?: AutosaveStatus;
  lastSavedAt?: Date | null;
  onRetryAutosave?: () => void;
}) {
  return (
    <header
      className={cn(
        "flex h-14 shrink-0 items-center justify-between border-b border-[#E2E8F0] bg-white px-4 lg:px-6",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-4">
        <h1 className="text-[15px] font-semibold text-[#0F172A]">Submit New Capability</h1>
        {autosaveStatus ? (
          <AutosaveStatusBar
            status={autosaveStatus}
            lastSavedAt={lastSavedAt ?? null}
            onRetry={onRetryAutosave}
          />
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-lg text-[#64748B] transition-colors hover:bg-[#F8FAFC]"
          aria-label="Notifications"
        >
          <Bell className="size-4" />
        </button>
        <button
          type="button"
          className="hidden size-9 items-center justify-center rounded-lg text-[#64748B] transition-colors hover:bg-[#F8FAFC] sm:flex"
          aria-label="Help"
        >
          <HelpCircle className="size-4" />
        </button>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] px-2 py-1.5 text-left transition-colors hover:bg-[#F8FAFC]"
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
