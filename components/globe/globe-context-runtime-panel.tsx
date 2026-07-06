"use client";

import { useMemo } from "react";
import { MapPin, PinOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { listContextRuntimeInventory } from "@/lib/globe/context-runtime/list-context-runtime-inventory";
import { runContextRuntimeManageAction } from "@/lib/globe/context-runtime/manage-context-runtime-item";
import type {
  ContextRuntimeItem,
  ContextRuntimeSection,
} from "@/lib/globe/context-runtime/types";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeContextRuntimePanelProps = {
  event: EventCandidate;
  onFlyTo?: (lat: number, lng: number) => void;
  onChanged?: () => void;
  className?: string;
};

function sectionLabel(section: ContextRuntimeSection): string {
  switch (section.key) {
    case "pinned":
      return copy.globe.containerSpaceRuntimePinned;
    case "pins":
      return copy.globe.containerSpaceRuntimePins;
    case "media":
      return copy.globe.containerSpaceRuntimeMedia;
    default:
      return "";
  }
}

function actionLabel(action: ContextRuntimeItem["actions"][number]): string {
  switch (action) {
    case "fly":
      return copy.globe.containerSpaceRuntimeFly;
    case "unpin":
      return copy.globe.containerSpaceRuntimeUnpin;
    case "remove_pin":
      return copy.globe.containerSpaceRuntimeRemovePin;
    case "remove_media":
      return copy.globe.containerSpaceRuntimeRemoveMedia;
    default:
      return "";
  }
}

function RuntimeRow({
  item,
  eventId,
  onFlyTo,
  onChanged,
}: {
  item: ContextRuntimeItem;
  eventId: string;
  onFlyTo?: (lat: number, lng: number) => void;
  onChanged?: () => void;
}) {
  const secondaryActions = item.actions.filter((action) => action !== "fly");
  const canFly =
    item.actions.includes("fly") &&
    item.lat != null &&
    item.lng != null &&
    Number.isFinite(item.lat) &&
    Number.isFinite(item.lng);

  const handleAction = (action: ContextRuntimeItem["actions"][number]) => {
    if (action === "fly") {
      if (canFly && onFlyTo) {
        onFlyTo(item.lat!, item.lng!);
      }
      return;
    }
    const destructive =
      action === "unpin" || action === "remove_pin" || action === "remove_media";
    if (destructive) {
      const confirmed = window.confirm(
        `${item.label}\n${actionLabel(action)}할까요?`,
      );
      if (!confirmed) {
        return;
      }
    }
    const ok = runContextRuntimeManageAction({
      eventId,
      action,
      pinEventId: item.pinEventId,
      guideNodeId: item.guideNodeId,
    });
    if (!ok) {
      toast.error(copy.globe.containerSpaceDeleteFail);
      return;
    }
    onChanged?.();
  };

  return (
    <div
      className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-2.5 py-2 ring-1 ring-white/6"
      data-globe-context-runtime-item={item.id}
    >
      {item.previewUrl ? (
        <span
          className="size-10 shrink-0 overflow-hidden rounded-lg bg-white/8 bg-cover bg-center"
          style={{ backgroundImage: `url(${item.previewUrl})` }}
          aria-hidden
        />
      ) : (
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/8 text-[12px] font-semibold text-white/70"
          aria-hidden
        >
          {item.label.slice(0, 1)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-white/92">{item.label}</p>
        {item.subtitle ? (
          <p className="truncate text-[11px] text-white/45">{item.subtitle}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        {canFly ? (
          <button
            type="button"
            onClick={() => handleAction("fly")}
            className="flex size-8 items-center justify-center rounded-full text-white/55 active:bg-white/10"
            aria-label={copy.globe.containerSpaceRuntimeFly}
            title={copy.globe.containerSpaceRuntimeFly}
          >
            <MapPin className="size-4" aria-hidden />
          </button>
        ) : null}
        {secondaryActions.map((action) => (
          <button
            key={action}
            type="button"
            onClick={() => handleAction(action)}
            className={cn(
              "flex size-8 items-center justify-center rounded-full active:bg-white/10",
              action === "unpin" ? "text-[#ff6b4a]/90" : "text-white/45",
            )}
            aria-label={actionLabel(action)}
            title={actionLabel(action)}
          >
            {action === "unpin" ? (
              <PinOff className="size-4" aria-hidden />
            ) : (
              <Trash2 className="size-4" aria-hidden />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Runtime objects inside a bound context — pins, pinned picks, media. */
export function GlobeContextRuntimePanel({
  event,
  onFlyTo,
  onChanged,
  className,
}: GlobeContextRuntimePanelProps) {
  const inventory = useMemo(() => listContextRuntimeInventory(event), [event]);

  if (!inventory || inventory.totalCount === 0) {
    return (
      <p
        className={cn(
          "px-2 py-8 text-center text-[13px] leading-relaxed text-white/45",
          className,
        )}
        data-globe-context-runtime-empty
      >
        {copy.globe.containerSpaceRuntimeEmpty.split("\n").map((line, index) => (
          <span key={line}>
            {index > 0 ? <br /> : null}
            {line}
          </span>
        ))}
      </p>
    );
  }

  return (
    <div className={cn("space-y-4 px-1", className)} data-globe-context-runtime-panel>
      {inventory.sections.map((section) => (
        <section key={section.key} data-globe-context-runtime-section={section.key}>
          <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wide text-white/40">
            {sectionLabel(section)}
          </p>
          <div className="space-y-1.5">
            {section.items.map((item) => (
              <RuntimeRow
                key={item.id}
                item={item}
                eventId={inventory.eventId}
                onFlyTo={onFlyTo}
                onChanged={onChanged}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
