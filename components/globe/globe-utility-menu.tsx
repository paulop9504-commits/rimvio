"use client";

import { useState } from "react";
import {
  ImagePlus,
  Inbox,
  ListChecks,
  MessageCircle,
  MoreHorizontal,
  Settings,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { GlobeFloatingMenu } from "@/components/globe/globe-floating-menu";
import { useCopy } from "@/hooks/use-copy";
import { cn } from "@/lib/utils";

export type GlobeUtilityMenuProps = {
  mediaPoolCount: number;
  inboxCount: number;
  marketManageCount?: number;
  fieldMatchCount?: number;
  showFieldEntry?: boolean;
  onOpenMediaPool: () => void;
  onOpenInbox: () => void;
  onOpenMarketManage?: () => void;
  onOpenField?: () => void;
  onOpenSettings: () => void;
  className?: string;
};

function formatBadgeCount(count: number): string | null {
  if (count <= 0) {
    return null;
  }
  return count > 9 ? "9+" : String(count);
}

/** Top-right globe tools — one chip; expand for media · inbox · settings. */
export function GlobeUtilityMenu({
  mediaPoolCount,
  inboxCount,
  marketManageCount = 0,
  fieldMatchCount = 0,
  showFieldEntry = false,
  onOpenMediaPool,
  onOpenInbox,
  onOpenMarketManage,
  onOpenField,
  onOpenSettings,
  className,
}: GlobeUtilityMenuProps) {
  const copy = useCopy();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const pendingTotal = mediaPoolCount + inboxCount + marketManageCount;
  const badge = formatBadgeCount(pendingTotal);

  const rows = [
    {
      id: "inbox" as const,
      icon: Inbox,
      label: copy.globe.utilityMenuInbox,
      badge: formatBadgeCount(inboxCount),
      onPress: () => {
        setOpen(false);
        onOpenInbox();
      },
    },
    ...(onOpenMarketManage
      ? [
          {
            id: "market" as const,
            icon: ListChecks,
            label: copy.globe.utilityMenuMarket,
            badge: formatBadgeCount(marketManageCount),
            onPress: () => {
              setOpen(false);
              onOpenMarketManage();
            },
          },
        ]
      : []),
    ...(showFieldEntry && onOpenField
      ? [
          {
            id: "field" as const,
            icon: Sparkles,
            label: copy.globe.utilityMenuField,
            badge: formatBadgeCount(fieldMatchCount),
            onPress: () => {
              setOpen(false);
              onOpenField();
            },
          },
        ]
      : []),
    {
      id: "peers" as const,
      icon: MessageCircle,
      label: copy.globe.utilityMenuPeers,
      badge: null,
      onPress: () => {
        setOpen(false);
        router.push("/peers");
      },
    },
    {
      id: "media" as const,
      icon: ImagePlus,
      label: copy.globe.utilityMenuMedia,
      badge: formatBadgeCount(mediaPoolCount),
      onPress: () => {
        setOpen(false);
        onOpenMediaPool();
      },
    },
    {
      id: "settings" as const,
      icon: Settings,
      label: copy.globe.utilityMenuSettings,
      badge: null,
      onPress: () => {
        setOpen(false);
        onOpenSettings();
      },
    },
  ];

  const primaryRow = rows.find((row) => row.badge) ?? rows[0];

  return (
    <GlobeFloatingMenu
      open={open}
      onOpenChange={setOpen}
      align="right"
      className={className}
      panelClassName="min-w-[10.75rem] p-1"
      trigger={
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className={cn(
            "relative flex size-10 items-center justify-center rounded-full bg-card/95 text-foreground shadow-sm ring-1 ring-border backdrop-blur-md transition active:scale-[0.98]",
            open && "ring-primary/30",
          )}
          aria-expanded={open}
          aria-label={copy.globe.utilityMenuTriggerAria}
          title={primaryRow.label}
          data-globe-utility-menu-trigger
        >
          <MoreHorizontal className="size-4 text-primary" aria-hidden />
          {badge ? (
            <span className="absolute -right-0.5 -top-0.5 flex min-w-[1.125rem] items-center justify-center rounded-full bg-primary px-1 py-px text-[10px] font-bold leading-none text-primary-foreground">
              {badge}
            </span>
          ) : null}
        </button>
      }
    >
      <div role="menu">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <button
              key={row.id}
              type="button"
              role="menuitem"
              onClick={row.onPress}
              className="flex w-full items-center gap-2.5 rounded-[0.75rem] px-2.5 py-2 text-left active:bg-muted/80"
              data-globe-utility-menu-item={row.id}
            >
              <Icon className="size-4 shrink-0 text-primary" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-foreground">
                {row.label}
              </span>
              {row.badge ? (
                <span className="rounded-full bg-primary/12 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                  {row.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </GlobeFloatingMenu>
  );
}
