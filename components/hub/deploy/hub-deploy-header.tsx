"use client";

import Link from "next/link";
import { Bell, Home, Search } from "lucide-react";
import type { AutosaveStatus } from "@/lib/hub/capability/types";
import { cn } from "@/lib/utils";

type HubDeployHeaderProps = {
  title: string;
  subtitle: string;
  autosaveStatus: AutosaveStatus;
  lastSavedAt: Date | null;
  onRetryAutosave?: () => void;
};

function formatSavedAt(date: Date | null): string {
  if (!date) return "";
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

export function HubDeployHeader({
  title,
  subtitle,
  autosaveStatus,
  lastSavedAt,
  onRetryAutosave,
}: HubDeployHeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#0c0e12] px-4">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium text-[#8ec0ff] hover:bg-white/[0.04]"
          title="Rimvio Agent"
        >
          <Home className="size-3.5" aria-hidden />
          <span className="hidden sm:inline">Agent</span>
        </Link>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-[#f2f4f6]">{title}</p>
          <p className="truncate text-[10px] text-[#6b7684]">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-lg border border-white/[0.08] bg-[#151820] px-2.5 py-1.5 md:flex">
          <Search className="size-3.5 text-[#6b7684]" aria-hidden />
          <span className="text-[11px] text-[#6b7684]">Hub 검색…</span>
        </div>

        <span
          className={cn(
            "text-[10px] font-medium",
            autosaveStatus === "saved"
              ? "text-[#6b7684]"
              : autosaveStatus === "saving"
                ? "text-[#8ec0ff]"
                : autosaveStatus === "error"
                  ? "text-red-400"
                  : "text-[#6b7684]",
          )}
        >
          {autosaveStatus === "saving"
            ? "저장 중…"
            : autosaveStatus === "error"
              ? (
                  <button type="button" onClick={onRetryAutosave} className="underline">
                    저장 실패 · 재시도
                  </button>
                )
              : lastSavedAt
                ? `저장됨 ${formatSavedAt(lastSavedAt)}`
                : "자동 저장"}
        </span>

        <span className="rounded-md bg-[#4593fc]/15 px-2 py-0.5 text-[10px] font-semibold text-[#8ec0ff]">
          Beta
        </span>

        <button
          type="button"
          className="flex size-8 items-center justify-center rounded-lg text-[#6b7684] hover:bg-white/[0.04] hover:text-[#b0b8c1]"
          aria-label="알림"
        >
          <Bell className="size-4" />
        </button>
      </div>
    </header>
  );
}
