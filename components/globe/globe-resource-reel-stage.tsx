"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { RefObject } from "react";
import { GlobeResourceReelListPanel } from "@/components/globe/globe-resource-reel-list-panel";
import { GlobeResourceReelDetail } from "@/components/globe/globe-resource-reel-detail";
import { GlobeResourceVideoBranch } from "@/components/globe/globe-resource-video-branch";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import { MAP_FOCUS_PIN_VIEWPORT_Y } from "@/lib/globe/map-anchored-overlay-layout";
import { recoverGlobeContextEventFromPin } from "@/lib/globe/recover-globe-context-event";
import { buildGlobeResourceReelItems } from "@/lib/globe/resource-reel/build-globe-resource-reel-items";
import {
  filterGlobeResourceReelItems,
  resolveResourceReelKindFilter,
  type ResourceReelKindFilter,
} from "@/lib/globe/resource-reel/resource-reel-kind-filter";
import {
  dispatchGlobeResourceReelStage,
  subscribeGlobeResourceReelFocus,
  subscribeGlobeResourceReelKindFilter,
} from "@/lib/globe/resource-reel/globe-resource-reel-bridge";
import { subscribeDiscoveryLensSession } from "@/lib/globe/discovery-lens";
import type {
  GlobeResourceReelItem,
  GlobeResourceReelSurface,
} from "@/lib/globe/resource-reel/types";
import {
  EVENT_CANDIDATES_UPDATED,
  findLifeEventCandidate,
} from "@/lib/life-read-model";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeResourceReelStageProps = {
  contextEventId: string | null | undefined;
  lat?: number | null;
  lng?: number | null;
  globeRef?: RefObject<RimvioGlobeHubHandle | null>;
  className?: string;
};

type ReelState = {
  open: boolean;
  surface: GlobeResourceReelSurface;
  contextEventId: string;
  activeResourceId: string | null;
  resumeIntent: "book" | "pay" | null;
};

const CLOSED_STATE: ReelState = {
  open: false,
  surface: "list",
  contextEventId: "",
  activeResourceId: null,
  resumeIntent: null,
};

export function GlobeResourceReelStage({
  contextEventId,
  lat = null,
  lng = null,
  globeRef,
  className,
}: GlobeResourceReelStageProps) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<ReelState>(CLOSED_STATE);
  const [kindFilter, setKindFilter] = useState<ResourceReelKindFilter>("all");

  useEffect(() => {
    const bump = () => setRevision((value) => value + 1);
    window.addEventListener(EVENT_CANDIDATES_UPDATED, bump);
    return () => window.removeEventListener(EVENT_CANDIDATES_UPDATED, bump);
  }, []);

  useEffect(() => {
    return subscribeDiscoveryLensSession(() => {
      setRevision((value) => value + 1);
    });
  }, []);

  useEffect(() => {
    return subscribeGlobeResourceReelKindFilter((detail) => {
      const eventId = detail.contextEventId.trim();
      if (!eventId) {
        return;
      }
      setKindFilter(detail.kindFilter);
      setState((current) => {
        if (current.open && current.contextEventId === eventId) {
          return { ...current, surface: "list", activeResourceId: null };
        }
        if (!current.open && contextEventId?.trim() === eventId) {
          return {
            open: true,
            surface: "list",
            contextEventId: eventId,
            activeResourceId: null,
            resumeIntent: null,
          };
        }
        return current;
      });
    });
  }, [contextEventId]);

  useEffect(() => {
    return subscribeGlobeResourceReelFocus((detail) => {
      const eventId = detail.contextEventId.trim();
      if (!eventId) {
        return;
      }
      setState({
        open: true,
        surface: detail.surface,
        contextEventId: eventId,
        activeResourceId: detail.resourceId?.trim() || null,
        resumeIntent: detail.resumeIntent ?? null,
      });
    });
  }, []);

  useEffect(() => {
    setState(CLOSED_STATE);
    dispatchGlobeResourceReelStage(false);
    globeRef?.current?.clearPinViewportBias();
  }, [contextEventId, globeRef]);

  useEffect(() => {
    dispatchGlobeResourceReelStage(state.open);
    if (!state.open) {
      return;
    }
    return () => {
      dispatchGlobeResourceReelStage(false);
    };
  }, [state.open]);

  const activeEvent = useMemo(() => {
    void revision;
    const eventId = state.open ? state.contextEventId : contextEventId?.trim();
    if (!eventId) {
      return null;
    }
    return findLifeEventCandidate(eventId) ?? recoverGlobeContextEventFromPin(eventId);
  }, [contextEventId, revision, state.contextEventId, state.open]);

  const items = useMemo(
    () => buildGlobeResourceReelItems(activeEvent),
    [activeEvent, revision],
  );

  const resolvedKindFilter = useMemo(
    () => resolveResourceReelKindFilter(items, kindFilter),
    [items, kindFilter],
  );

  const filteredItems = useMemo(
    () => filterGlobeResourceReelItems(items, resolvedKindFilter),
    [items, resolvedKindFilter],
  );

  useEffect(() => {
    setKindFilter((current) => resolveResourceReelKindFilter(items, current));
  }, [items]);

  useEffect(() => {
    if (!state.open) {
      setKindFilter("all");
    }
  }, [state.open]);

  const activeItem = useMemo(() => {
    if (!state.activeResourceId) {
      return filteredItems[0] ?? null;
    }
    return (
      filteredItems.find((row) => row.resourceId === state.activeResourceId) ??
      filteredItems[0] ??
      null
    );
  }, [filteredItems, state.activeResourceId]);

  const dismiss = useCallback(() => {
    globeRef?.current?.clearPinViewportBias();
    setState(CLOSED_STATE);
  }, [globeRef]);

  const openDetail = useCallback(
    (item: GlobeResourceReelItem) => {
      setState((current) => ({
        ...current,
        open: true,
        surface: "detail",
        activeResourceId: item.resourceId,
      }));
      globeRef?.current?.flyToPin(item.lat, item.lng, "neighborhood", {
        pinViewportY: MAP_FOCUS_PIN_VIEWPORT_Y,
      });
    },
    [globeRef],
  );

  const areaLabel =
    activeEvent?.place?.trim() ||
    activeEvent?.title?.trim() ||
    items[0]?.secondaryLine?.trim() ||
    copy.globe.resourceReelAreaFallback;

  if (!state.open || items.length === 0) {
    return (
      <div
        className={cn("pointer-events-none absolute inset-0 z-[21] overflow-hidden", className)}
        aria-hidden
      />
    );
  }

  if (state.surface === "list") {
    return (
      <GlobeResourceReelListPanel
        className={className}
        areaLabel={areaLabel}
        items={filteredItems}
        allItems={items}
        kindFilter={resolvedKindFilter}
        onKindFilterChange={setKindFilter}
        activeResourceId={state.activeResourceId}
        onItemPress={openDetail}
        onDismiss={dismiss}
      />
    );
  }

  if (!activeItem) {
    return null;
  }

  return (
    <div
      className={cn("pointer-events-none absolute inset-0 z-[30] overflow-hidden", className)}
      data-globe-resource-reel-detail-stage
    >
      <button
        type="button"
        className="pointer-events-auto absolute inset-0 z-[0] bg-black/10"
        aria-label={copy.globe.resourceReelCloseAria}
        onClick={dismiss}
      />
      <div
        className="pointer-events-none absolute z-[1] flex items-center px-3"
        style={{
          top: "max(3.5rem, calc(env(safe-area-inset-top) + 2rem))",
          bottom: "calc(var(--rimvio-globe-ingest-offset, 5.5rem) + 0.5rem)",
          left: 0,
          maxWidth: "min(100%, 20rem)",
        }}
      >
        <GlobeResourceReelDetail
          item={activeItem}
          items={filteredItems}
          contextEventId={state.contextEventId}
          lat={lat}
          lng={lng}
          globeRef={globeRef}
          onDismiss={dismiss}
          onSelectItem={openDetail}
          resumeIntent={state.resumeIntent}
        />
      </div>
      {activeItem.kind === "lodging" || activeItem.kind === "eatery" ? (
        <div
          className="pointer-events-none absolute z-[1] flex items-center"
          style={{
            top: "max(3.5rem, calc(env(safe-area-inset-top) + 2rem))",
            bottom: "calc(var(--rimvio-globe-ingest-offset, 5.5rem) + 0.5rem)",
            left: "min(calc(100% - 10rem), 20.5rem)",
          }}
        >
          <GlobeResourceVideoBranch
            key={activeItem.resourceId}
            name={activeItem.title}
            place={areaLabel}
            kind={activeItem.kind}
            lat={activeItem.lat}
            lng={activeItem.lng}
          />
        </div>
      ) : null}
      {filteredItems.length > 1 ? (
        <button
          type="button"
          onClick={() =>
            setState((current) => ({
              ...current,
              surface: "list",
            }))
          }
          className="pointer-events-auto absolute right-3 z-[2] rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-[#222] shadow-md ring-1 ring-black/[0.08]"
          style={{
            top: "max(3.5rem, calc(env(safe-area-inset-top) + 2rem))",
          }}
        >
          {copy.globe.resourceReelBackToList}
        </button>
      ) : null}
    </div>
  );
}
