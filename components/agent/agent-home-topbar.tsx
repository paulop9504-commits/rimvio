"use client";

import { Bell, Search, Settings } from "lucide-react";
import { useAgentHomeThemeContext } from "@/components/agent/agent-home-theme-context";
import { copy } from "@/lib/copy/human-ko";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

type AgentHomeTopbarProps = {
  readonly onOpenSettings: () => void;
  readonly searchValue?: string;
  readonly onSearchChange?: (value: string) => void;
  readonly onSearchSubmit?: () => void;
};

export function AgentHomeTopbar({
  onOpenSettings,
  searchValue = "",
  onSearchChange,
  onSearchSubmit,
}: AgentHomeTopbarProps) {
  const { tokens } = useAgentHomeThemeContext();
  const { user } = useAuth();

  const displayName =
    user?.user_metadata?.full_name?.trim() ||
    user?.email?.split("@")[0] ||
    "Guest";

  return (
    <header
      className={cn(
        "hidden shrink-0 items-center gap-4 border-b px-4 py-2 md:flex",
        tokens.panel,
        tokens.panelBorder,
      )}
    >
      <div className="w-[120px] shrink-0" />

      <div className="mx-auto flex w-full max-w-[420px] flex-1 items-center gap-2 rounded-full border border-[#e5e7eb] bg-[#fafafa] px-3 py-1.5 shadow-sm">
        <Search className="size-3.5 shrink-0 text-[#9ca3af]" aria-hidden />
        <input
          value={searchValue}
          onChange={(e) => onSearchChange?.(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSearchSubmit?.();
            }
          }}
          placeholder={copy.globe.agentHomeSearchPlaceholder}
          className={cn(
            "min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-[#9ca3af]",
            tokens.text,
          )}
        />
      </div>

      <div className="flex w-[120px] shrink-0 items-center justify-end gap-1">
        <span className="hidden items-center gap-1 rounded-full bg-[#ecfdf5] px-1.5 py-0.5 text-[9px] font-semibold text-[#059669] lg:inline-flex">
          <span className="size-1.5 rounded-full bg-[#10b981]" />
          {copy.globe.agentHomeOnlineStatus}
        </span>
        <button
          type="button"
          className={cn("flex size-7 items-center justify-center rounded-lg", tokens.badge, "hover:opacity-80")}
          aria-label="Notifications"
        >
          <Bell className="size-3.5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          className={cn("flex size-7 items-center justify-center rounded-lg", tokens.badge, "hover:opacity-80")}
          aria-label={copy.globe.agentHomeSidebarSettings}
        >
          <Settings className="size-3.5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          className={cn(
            "flex size-7 items-center justify-center rounded-full text-[10px] font-bold",
            tokens.accentSoft,
          )}
          aria-label={displayName}
        >
          {displayName.slice(0, 1).toUpperCase()}
        </button>
      </div>
    </header>
  );
}
