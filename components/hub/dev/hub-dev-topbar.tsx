"use client";

import Link from "next/link";
import { Bell, ChevronDown, HelpCircle, Play, Rocket, Search, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

type HubDevTopbarProps = {
  platformName: string;
  environment: "Development" | "Preview" | "Production";
  previewActive?: boolean;
  onTogglePreview?: () => void;
  onRun?: () => void;
  onDeploy?: () => void;
  onPublish?: () => void;
  publishDisabled?: boolean;
  onOpenCommandPalette?: () => void;
};

export function HubDevTopbar({
  platformName,
  environment,
  previewActive,
  onTogglePreview,
  onRun,
  onDeploy,
  onPublish,
  publishDisabled,
  onOpenCommandPalette,
}: HubDevTopbarProps) {
  return (
    <header className="flex h-11 shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#0a0c10] px-3">
      <div className="flex min-w-0 items-center gap-3">
        <Link href="/hub" className="text-[13px] font-bold text-[#f2f4f6]">
          Rimvio
        </Link>
        <span className="text-[#3d4450]">/</span>
        <span className="truncate text-[12px] font-medium text-[#b0b8c1]">Dev Workspace</span>
        <span className="hidden truncate text-[12px] font-semibold text-[#8ec0ff] sm:inline">
          {platformName}
        </span>
        <button
          type="button"
          className="hidden items-center gap-1 rounded-md border border-white/[0.08] bg-[#151820] px-2 py-0.5 text-[10px] text-[#b0b8c1] sm:flex"
        >
          {environment}
          <ChevronDown className="size-3" />
        </button>
        <button
          type="button"
          onClick={onTogglePreview}
          className={cn(
            "rounded-md px-2 py-0.5 text-[10px] font-medium",
            previewActive
              ? "bg-emerald-500/15 text-emerald-400"
              : "text-[#6b7684] hover:bg-white/[0.04]",
          )}
        >
          ● Preview
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="hidden items-center gap-2 rounded-lg border border-white/[0.08] bg-[#151820] px-2.5 py-1 text-[11px] text-[#6b7684] md:flex"
        >
          <Search className="size-3.5" />
          <span>⌘K</span>
        </button>
        <button
          type="button"
          onClick={onRun}
          className="flex items-center gap-1 rounded-lg border border-white/[0.08] px-2.5 py-1 text-[11px] font-medium text-[#b0b8c1] hover:bg-white/[0.04]"
        >
          <Play className="size-3.5" />
          Run
        </button>
        <button
          type="button"
          onClick={onDeploy}
          className="flex items-center gap-1 rounded-lg border border-white/[0.08] px-2.5 py-1 text-[11px] font-medium text-[#b0b8c1] hover:bg-white/[0.04]"
        >
          <Rocket className="size-3.5" />
          Deploy
        </button>
        <button
          type="button"
          onClick={onPublish}
          disabled={publishDisabled}
          className="flex items-center gap-1 rounded-lg bg-[#4593fc] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#3a82e0] disabled:opacity-40"
        >
          <Upload className="size-3.5" />
          Publish
        </button>
        <button type="button" className="p-1.5 text-[#6b7684] hover:text-[#b0b8c1]" aria-label="Help">
          <HelpCircle className="size-4" />
        </button>
        <button type="button" className="p-1.5 text-[#6b7684] hover:text-[#b0b8c1]" aria-label="Notifications">
          <Bell className="size-4" />
        </button>
        <div className="ml-1 size-7 rounded-full bg-gradient-to-br from-[#4593fc] to-[#6366f1]" />
      </div>
    </header>
  );
}
