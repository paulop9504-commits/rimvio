"use client";

import { Menu } from "lucide-react";
import { useAgentHomeThemeContext } from "@/components/agent/agent-home-theme-context";
import { copy } from "@/lib/copy/human-ko";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

type AgentHomeTopbarProps = {
  readonly onOpenSettings: () => void;
  readonly onOpenSidebar?: () => void;
  readonly title?: string | null;
};

export function AgentHomeTopbar({
  onOpenSettings,
  onOpenSidebar,
  title = null,
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
        "flex shrink-0 items-center gap-3 px-3 py-2 md:px-4",
        tokens.panel,
      )}
    >
      <button
        type="button"
        onClick={onOpenSidebar}
        className={cn(
          "flex size-9 items-center justify-center rounded-lg md:hidden",
          tokens.textMuted,
          "hover:bg-black/[0.05]",
        )}
        aria-label={copy.globe.agentHomeOpenSidebar}
      >
        <Menu className="size-5" aria-hidden />
      </button>

      <p className={cn("min-w-0 flex-1 truncate text-[14px] font-medium", tokens.text)}>
        {title?.trim() || copy.brand.name}
      </p>

      <button
        type="button"
        onClick={onOpenSettings}
        className={cn(
          "flex size-8 items-center justify-center rounded-full text-[11px] font-semibold",
          tokens.accentSoft,
        )}
        aria-label={displayName}
      >
        {displayName.slice(0, 1).toUpperCase()}
      </button>
    </header>
  );
}
