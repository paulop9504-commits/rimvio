"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, ChevronDown, CircleHelp, Play, Rocket, Search, Upload } from "lucide-react";
import { HubDevUserMenu } from "@/components/hub/dev/hub-dev-user-menu";
import type { DevEnvironment } from "@/lib/hub/dev/platform-context-values";
import type { StoredPlatform } from "@/lib/hub/dev/platform-registry";
import { cn } from "@/lib/utils";

type HubDevTopbarProps = {
  platformName: string;
  platformId?: string;
  platforms?: readonly StoredPlatform[];
  environment: DevEnvironment;
  previewActive?: boolean;
  onSelectPlatform?: (platformId: string) => void;
  onEnvironmentChange?: (environment: DevEnvironment) => void;
  onTogglePreview?: () => void;
  onRun?: () => void;
  onDeploy?: () => void;
  onPublish?: () => void;
  publishDisabled?: boolean;
  onOpenCommandPalette?: () => void;
  onOpenHelp?: () => void;
  onOpenNotifications?: () => void;
  notificationCount?: number;
  liveUser?: {
    readonly id?: string;
    readonly name: string;
    readonly email: string | null;
    readonly avatarUrl: string | null;
  } | null;
};

export function HubDevTopbar({
  platformName,
  platformId,
  platforms = [],
  environment,
  previewActive,
  onSelectPlatform,
  onEnvironmentChange,
  onTogglePreview,
  onRun,
  onDeploy,
  onPublish,
  publishDisabled,
  onOpenCommandPalette,
  onOpenHelp,
  onOpenNotifications,
  notificationCount,
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
        <MenuButton label={platformName || "New Platform"} bold>
          {platforms.length === 0 ? (
            <p className="px-3 py-2 text-[11px] text-[#9ca3af]">등록된 플랫폼이 없습니다</p>
          ) : (
            platforms.map((p) => (
              <MenuItem
                key={p.meta.id}
                active={p.meta.id === platformId}
                onClick={() => onSelectPlatform?.(p.meta.id)}
              >
                {p.meta.name}
              </MenuItem>
            ))
          )}
          <Link href="/hub" className="block border-t border-[#f3f4f6] px-3 py-2 text-[11px] text-violet-700 hover:bg-violet-50">
            All Platforms
          </Link>
        </MenuButton>
        <MenuButton label={environment}>
          {(["Development", "Preview", "Production"] as const).map((env) => (
            <MenuItem key={env} active={environment === env} onClick={() => onEnvironmentChange?.(env)}>
              {env}
            </MenuItem>
          ))}
        </MenuButton>
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
        <button
          type="button"
          onClick={onOpenHelp}
          className="p-2 text-[#9ca3af] hover:text-[#6b7280]"
          aria-label="Help"
        >
          <CircleHelp className="size-4" />
        </button>
        <button
          type="button"
          onClick={onOpenNotifications}
          className="relative p-2 text-[#9ca3af] hover:text-[#6b7280]"
          aria-label="Notifications"
        >
          <Bell className="size-4" />
          {notificationCount ? (
            <span className="absolute right-1 top-1 size-1.5 rounded-full bg-violet-600" />
          ) : null}
        </button>
        <HubDevUserMenu liveUser={liveUser ?? null} />
      </div>
    </header>
  );
}

function MenuButton({
  label,
  bold,
  children,
}: {
  label: string;
  bold?: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-[#f3f4f6]",
          bold
            ? "text-[12px] font-semibold text-[#374151]"
            : "hidden border border-[#e5e7eb] text-[11px] text-[#6b7280] sm:flex",
        )}
      >
        <span className="max-w-[140px] truncate">{label}</span>
        <ChevronDown className="size-3.5 text-[#9ca3af]" />
      </button>
      {open ? (
        <div
          className="absolute left-0 z-40 mt-1 min-w-[180px] overflow-hidden rounded-xl border border-[#e5e7eb] bg-white py-1 shadow-lg"
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "block w-full px-3 py-1.5 text-left text-[11px]",
        active ? "bg-violet-50 font-semibold text-violet-700" : "text-[#374151] hover:bg-[#f9fafb]",
      )}
    >
      {children}
    </button>
  );
}
