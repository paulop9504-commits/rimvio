"use client";

import Link from "next/link";
import {
  Bell,
  ChevronDown,
  CircleHelp,
  Eye,
  Play,
  Rocket,
  Search,
  Upload,
} from "lucide-react";
import { HubDevUserMenu } from "@/components/hub/dev/hub-dev-user-menu";
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
  liveUser?: {
    readonly id?: string;
    readonly name: string;
    readonly email: string | null;
    readonly avatarUrl: string | null;
  } | null;
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
  liveUser,
}: HubDevTopbarProps) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-[#e5e7eb] bg-white px-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="hidden items-center gap-1.5 sm:flex">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </div>
        <Link href="/hub" className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-[11px] font-bold text-white">
            R
          </span>
          <span className="text-[13px] font-bold text-[#111827]">Rimvio Dev Hub</span>
        </Link>
        <span className="text-[#d1d5db]">/</span>
        <button type="button" className="flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-semibold text-[#374151] hover:bg-[#f3f4f6]">
          {platformName || "New Platform"}
          <ChevronDown className="size-3.5 text-[#9ca3af]" />
        </button>
        <button type="button" className="hidden items-center gap-1 rounded-lg border border-[#e5e7eb] px-2 py-1 text-[11px] text-[#6b7280] sm:flex">
          {environment}
          <ChevronDown className="size-3" />
        </button>
        <button
          type="button"
          onClick={onTogglePreview}
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
            previewActive
              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
              : "bg-[#f3f4f6] text-[#6b7280]",
          )}
        >
          ● Preview
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="hidden items-center gap-2 rounded-lg border border-[#e5e7eb] bg-[#fafafa] px-2.5 py-1.5 text-[11px] text-[#9ca3af] md:flex"
        >
          <Search className="size-3.5" />
          ⌘K
        </button>
        <button
          type="button"
          onClick={onRun}
          className="flex items-center gap-1.5 rounded-xl border border-[#e5e7eb] bg-white px-3 py-1.5 text-[12px] font-medium text-[#374151] shadow-sm hover:bg-[#fafafa]"
        >
          <Play className="size-3.5" />
          Run Preview
        </button>
        <button
          type="button"
          onClick={onDeploy}
          className="flex items-center gap-1.5 rounded-xl border border-[#e5e7eb] bg-white px-3 py-1.5 text-[12px] font-medium text-[#374151] shadow-sm hover:bg-[#fafafa]"
        >
          <Rocket className="size-3.5" />
          Deploy
        </button>
        <button
          type="button"
          onClick={onPublish}
          disabled={publishDisabled}
          className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-1.5 text-[12px] font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-40"
        >
          <Upload className="size-3.5" />
          Publish
        </button>
        <button type="button" className="p-2 text-[#9ca3af] hover:text-[#6b7280]" aria-label="Help">
          <CircleHelp className="size-4" />
        </button>
        <button type="button" className="p-2 text-[#9ca3af] hover:text-[#6b7280]" aria-label="Notifications">
          <Bell className="size-4" />
        </button>
        <HubDevUserMenu liveUser={liveUser ?? null} />
      </div>
    </header>
  );
}
