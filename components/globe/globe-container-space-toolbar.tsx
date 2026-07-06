"use client";

import type { LucideIcon } from "lucide-react";
import {
  CalendarRange,
  ImagePlus,
  Images,
  Inbox,
  LayoutGrid,
  ListChecks,
  ListTodo,
  MessageCircle,
  Settings,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

function formatBadgeCount(count: number): string | null {
  if (count <= 0) {
    return null;
  }
  return count > 9 ? "9+" : String(count);
}

export type GlobeContainerSpaceToolbarItem = {
  id: string;
  icon: LucideIcon;
  label: string;
  badge?: string | null;
  onPress: () => void;
};

export type GlobeContainerSpaceToolbarProps = {
  onCreatePhoto: () => void;
  onOpenList: () => void;
  onOpenManage: () => void;
  onPortalPeekToggle: () => void;
  inboxCount: number;
  mediaPoolCount: number;
  marketManageCount: number;
  workQueueCount: number;
  onOpenInbox: () => void;
  onOpenMediaPool: () => void;
  onOpenMarketManage?: () => void;
  onOpenSettings: () => void;
  onOpenWorkQueue: () => void;
  onAfterAction?: () => void;
  memoryRecall?: {
    hasContent: boolean;
    open: boolean;
    onToggle: () => void;
  } | null;
  /** When false, section title is rendered by the sidebar accordion. */
  showSectionTitle?: boolean;
  className?: string;
};

function ToolbarButton({
  icon: Icon,
  label,
  badge,
  onPress,
  active,
  dataId,
}: {
  icon: LucideIcon;
  label: string;
  badge?: string | null;
  onPress: () => void;
  active?: boolean;
  dataId: string;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={cn(
        "relative flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-center transition-colors",
        active
          ? "bg-white/12 text-white ring-1 ring-white/20"
          : "text-white/80 hover:bg-white/[0.06] active:bg-white/10",
      )}
      data-globe-container-space-tool={dataId}
    >
      <span
        className={cn(
          "flex size-9 items-center justify-center rounded-xl",
          active ? "bg-[#ff6b4a]/90 text-white" : "bg-white/10 text-white/90",
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="line-clamp-2 w-full text-[10px] font-semibold leading-tight">
        {label}
      </span>
      {badge ? (
        <span className="absolute right-1 top-1 flex min-w-[1rem] items-center justify-center rounded-full bg-[#3b82f6] px-1 py-px text-[9px] font-bold leading-none text-white">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

/** Icon grid — former left dock + top-right utility menu, consolidated. */
export function GlobeContainerSpaceToolbar({
  onCreatePhoto,
  onOpenList,
  onOpenManage,
  onPortalPeekToggle,
  inboxCount,
  mediaPoolCount,
  marketManageCount,
  workQueueCount,
  onOpenInbox,
  onOpenMediaPool,
  onOpenMarketManage,
  onOpenSettings,
  onOpenWorkQueue,
  onAfterAction,
  memoryRecall = null,
  showSectionTitle = true,
  className,
}: GlobeContainerSpaceToolbarProps) {
  const router = useRouter();

  const wrap = (action: () => void) => () => {
    action();
    onAfterAction?.();
  };

  const items: GlobeContainerSpaceToolbarItem[] = [
    {
      id: "list",
      icon: CalendarRange,
      label: copy.globe.listTitle,
      onPress: wrap(onOpenList),
    },
    {
      id: "manage",
      icon: ListChecks,
      label: copy.globe.dockManageLabel,
      onPress: wrap(onOpenManage),
    },
    {
      id: "photo",
      icon: ImagePlus,
      label: copy.globe.dockCreateAria,
      onPress: wrap(onCreatePhoto),
    },
    {
      id: "portal",
      icon: LayoutGrid,
      label: copy.portal.projectionEyebrow,
      onPress: wrap(onPortalPeekToggle),
    },
    {
      id: "inbox",
      icon: Inbox,
      label: copy.globe.utilityMenuInbox,
      badge: formatBadgeCount(inboxCount),
      onPress: wrap(onOpenInbox),
    },
    {
      id: "media",
      icon: Images,
      label: copy.globe.utilityMenuMedia,
      badge: formatBadgeCount(mediaPoolCount),
      onPress: wrap(onOpenMediaPool),
    },
    {
      id: "peers",
      icon: MessageCircle,
      label: copy.globe.utilityMenuPeers,
      onPress: wrap(() => router.push("/peers")),
    },
    {
      id: "settings",
      icon: Settings,
      label: copy.globe.utilityMenuSettings,
      onPress: wrap(onOpenSettings),
    },
  ];

  if (workQueueCount > 0) {
    items.push({
      id: "queue",
      icon: ListTodo,
      label: copy.globe.workQueue.peekLabel(workQueueCount),
      badge: formatBadgeCount(workQueueCount),
      onPress: wrap(onOpenWorkQueue),
    });
  }

  if (onOpenMarketManage && marketManageCount > 0) {
    items.push({
      id: "market",
      icon: ListChecks,
      label: copy.globe.utilityMenuMarket,
      badge: formatBadgeCount(marketManageCount),
      onPress: wrap(onOpenMarketManage),
    });
  }

  if (memoryRecall?.hasContent) {
    items.push({
      id: "memory",
      icon: Sparkles,
      label: copy.globe.memoryRecallEyebrow,
      onPress: wrap(memoryRecall.onToggle),
    });
  }

  return (
    <section className={cn("px-1", className)} data-globe-container-space-toolbar>
      {showSectionTitle ? (
        <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wide text-white/40">
          {copy.globe.containerSpaceToolsSection}
        </p>
      ) : null}
      <div className="grid grid-cols-4 gap-0.5">
        {items.map((item) => {
          const active =
            item.id === "memory" ? Boolean(memoryRecall?.open) : false;
          return (
            <ToolbarButton
              key={item.id}
              dataId={item.id}
              icon={item.icon}
              label={item.label}
              badge={item.badge}
              onPress={item.onPress}
              active={active}
            />
          );
        })}
      </div>
    </section>
  );
}
