"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { GlobeHubResourceCarousel } from "@/components/globe/globe-hub-resource-carousel";
import { connectDepartureHubToContext } from "@/lib/globe/connect-departure-hub-to-context";
import { buildHubCarouselSlides } from "@/lib/globe/context-hub/build-hub-carousel-slides";
import {
  foldContextHubLearning,
  recordContextHubTelemetry,
} from "@/lib/globe/context-hub/record-context-hub-telemetry";
import {
  listContextHubServicesForEvent,
  type ContextHubServiceId,
  type ContextHubServiceRow,
} from "@/lib/globe/context-hub/context-hub-service-catalog";
import { rankContextHubServices } from "@/lib/globe/context-hub/rank-context-hub-services";
import type { DepartureHubAirportId } from "@/lib/globe/departure-hub-airports";
import {
  resolvePinScopeFromEventId,
  writeGlobeOrchestratorScopeHint,
} from "@/lib/globe/globe-orchestrator-scope-bridge";
import {
  EVENT_CANDIDATES_UPDATED,
  findLifeEventCandidate,
} from "@/lib/life-read-model";
import { PERSONAL_GLOBE_PINS_UPDATED } from "@/lib/globe/personal-globe-pin-store";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";
import { HubServiceSlot } from "@/components/globe/globe-context-hub-service-slot";

export type GlobeContextHubAlternate = {
  eventId: string;
  title: string;
  place: string;
};

export type GlobeContextHubRailProps = {
  activeEventId?: string | null;
  alternateContexts?: readonly GlobeContextHubAlternate[];
  onSelectContext?: (eventId: string) => void;
  onDismiss?: () => void;
  visible?: boolean;
  className?: string;
};

const PANEL_WIDTH = "w-[min(calc(100vw-1.5rem),17.5rem)]";

function openExternalHref(href: string) {
  if (href.startsWith("/")) {
    window.location.assign(href);
    return;
  }
  window.open(href, "_blank", "noopener,noreferrer");
}

export function GlobeContextHubRail({
  activeEventId,
  alternateContexts = [],
  onSelectContext,
  onDismiss,
  visible = true,
  className,
}: GlobeContextHubRailProps) {
  const router = useRouter();
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [connectServiceId, setConnectServiceId] = useState<ContextHubServiceId | null>(
    null,
  );
  const [expanded, setExpanded] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);

  useEffect(() => {
    setExpanded(false);
    setCarouselIndex(0);
    setConnectServiceId(null);
  }, [activeEventId]);

  useEffect(() => {
    const bump = () => setRevision((value) => value + 1);
    window.addEventListener(EVENT_CANDIDATES_UPDATED, bump);
    window.addEventListener(PERSONAL_GLOBE_PINS_UPDATED, bump);
    return () => {
      window.removeEventListener(EVENT_CANDIDATES_UPDATED, bump);
      window.removeEventListener(PERSONAL_GLOBE_PINS_UPDATED, bump);
    };
  }, []);

  const panel = useMemo(() => {
    void revision;
    const eventId = activeEventId?.trim();
    if (!eventId) {
      return null;
    }
    const event = findLifeEventCandidate(eventId);
    return listContextHubServicesForEvent(event);
  }, [activeEventId, revision]);

  const rankedRows = useMemo(
    () => (panel ? rankContextHubServices(panel.services) : []),
    [panel],
  );

  const slides = useMemo(() => {
    const eventId = activeEventId?.trim();
    if (!eventId || rankedRows.length === 0) {
      return [];
    }
    return buildHubCarouselSlides({
      resources: rankedRows,
      alternates: alternateContexts,
      activeEventId: eventId,
    });
  }, [activeEventId, alternateContexts, rankedRows]);

  const telemetryLabelForSlide = useCallback((index: number): string | null => {
    const slide = slides[index];
    if (!slide) {
      return null;
    }
    if (slide.kind === "context") {
      return copy.globe.contextHubSwitchTitle(slide.alternate.title);
    }
    return slide.row.link?.actionLabelKo ?? slide.row.handoffLabelKo ?? slide.row.labelKo;
  }, [slides]);

  const handleOpenAction = useCallback(
    (url: string, label: string) => {
      const eventId = activeEventId?.trim();
      const event = eventId ? findLifeEventCandidate(eventId) : null;
      if (event) {
        recordContextHubTelemetry({ event, kind: "clicked", label });
        recordContextHubTelemetry({ event, kind: "executed", label });
        foldContextHubLearning(event);
      }
      openExternalHref(url);
    },
    [activeEventId],
  );

  const handleOpenHandoff = useCallback(
    (href: string, label: string, internalRoute = false) => {
      const eventId = activeEventId?.trim();
      const event = eventId ? findLifeEventCandidate(eventId) : null;
      if (event) {
        if (internalRoute) {
          writeGlobeOrchestratorScopeHint({
            pinScope: resolvePinScopeFromEventId(eventId) ?? "internal",
            eventId,
            title: event.title,
          });
        }
        recordContextHubTelemetry({ event, kind: "clicked", label });
        recordContextHubTelemetry({ event, kind: "executed", label });
        foldContextHubLearning(event);
      }
      if (internalRoute) {
        router.push(href);
        return;
      }
      openExternalHref(href);
    },
    [activeEventId, router],
  );

  const runCarouselRow = useCallback(
    (row: ContextHubServiceRow) => {
      const label = row.link?.actionLabelKo ?? row.handoffLabelKo ?? row.labelKo;
      if (row.serviceId === "ticket" && row.handoffHref && !row.handoffHref.startsWith("/")) {
        handleOpenHandoff(row.handoffHref, label);
        return;
      }
      if (row.connected && row.link?.actionUrl) {
        handleOpenAction(row.link.actionUrl, label);
        return;
      }
      if (row.handoffHref) {
        handleOpenHandoff(
          row.handoffHref,
          label,
          row.serviceId === "ai_search",
        );
        return;
      }
      setExpanded(true);
      setConnectServiceId(row.serviceId);
    },
    [handleOpenAction, handleOpenHandoff],
  );

  const handleDismiss = useCallback(() => {
    const eventId = activeEventId?.trim();
    const event = eventId ? findLifeEventCandidate(eventId) : null;
    const label = telemetryLabelForSlide(carouselIndex);
    if (event && label) {
      recordContextHubTelemetry({ event, kind: "dismissed", label });
      foldContextHubLearning(event);
    }
    onDismiss?.();
  }, [activeEventId, carouselIndex, onDismiss, telemetryLabelForSlide]);

  useEffect(() => {
    void revision;
    const eventId = activeEventId?.trim();
    const label = telemetryLabelForSlide(carouselIndex);
    if (!eventId || !label) {
      return;
    }
    const event = findLifeEventCandidate(eventId);
    if (!event) {
      return;
    }
    recordContextHubTelemetry({ event, kind: "shown", label });
  }, [activeEventId, carouselIndex, revision, telemetryLabelForSlide]);

  const handleConnectFlight = useCallback(
    async (airportId: DepartureHubAirportId) => {
      const eventId = activeEventId?.trim();
      if (!eventId || busy) {
        return;
      }
      const event = findLifeEventCandidate(eventId);
      setBusy(true);
      try {
        connectDepartureHubToContext({
          destinationEventId: eventId,
          airportId,
        });
        if (event) {
          recordContextHubTelemetry({ event, kind: "clicked", label: airportId });
          foldContextHubLearning(event);
        }
        const label =
          panel?.services
            .find((row) => row.serviceId === "flight")
            ?.flightOptions.find((row) => row.id === airportId)?.shortLabelKo ?? airportId;
        toast.success(copy.globe.departureHubConnected(label));
        setConnectServiceId(null);
        setRevision((value) => value + 1);
      } catch (caught) {
        toast.error(
          caught instanceof Error
            ? caught.message
            : copy.globe.departureHubConnectFail,
        );
      } finally {
        setBusy(false);
      }
    },
    [activeEventId, busy, panel?.services],
  );

  if (!visible || !panel || slides.length === 0) {
    return null;
  }

  if (!expanded) {
    return (
      <GlobeHubResourceCarousel
        className={className}
        slides={slides}
        index={Math.min(carouselIndex, slides.length - 1)}
        onIndexChange={setCarouselIndex}
        onRunResource={runCarouselRow}
        onSelectContext={(eventId) => onSelectContext?.(eventId)}
        onDismiss={handleDismiss}
        onExpand={() => setExpanded(true)}
        busy={busy}
        contextPlace={panel.contextPlace}
      />
    );
  }

  return (
    <aside
      className={cn(
        "pointer-events-auto overflow-hidden rounded-[1.35rem] border border-border/60 bg-card/95 shadow-[0_12px_40px_rgba(2,32,71,0.12)] backdrop-blur-xl",
        PANEL_WIDTH,
        className,
      )}
      data-globe-context-hub-rail
      data-globe-context-hub-rail-expanded="true"
      aria-label={copy.globe.contextHubRailTitle}
    >
      <div className="flex items-start gap-2 border-b border-border/50 px-3.5 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
            {copy.globe.contextHubEyebrow}
          </p>
          <p className="text-[14px] font-semibold leading-tight text-foreground">
            {copy.globe.contextHubRailTitle}
          </p>
          <p
            className="mt-1 truncate text-[11px] font-medium text-muted-foreground"
            title={panel.contextPlace}
          >
            {copy.globe.contextHubRailForContext(panel.contextPlace)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted/60 active:bg-muted"
          aria-expanded
          aria-label={copy.globe.contextHubCollapseAria}
          data-globe-hub-rail-collapse
        >
          <ChevronDown className="size-4 rotate-180 text-muted-foreground" aria-hidden />
        </button>
      </div>

      <ul className="space-y-2 px-2.5 py-2.5">
        {rankedRows.map((row) => (
          <HubServiceSlot
            key={row.serviceId}
            row={row}
            connectOpen={connectServiceId === row.serviceId}
            busy={busy}
            emphasized={
              slides[carouselIndex]?.kind === "resource" &&
              slides[carouselIndex]?.row.serviceId === row.serviceId
            }
            onToggleConnect={() =>
              setConnectServiceId((current) =>
                current === row.serviceId ? null : row.serviceId,
              )
            }
            onConnectFlight={(airportId) => void handleConnectFlight(airportId)}
            onOpenAction={(url, label) => handleOpenAction(url, label)}
            onOpenHandoff={(href, label, internalRoute) =>
              handleOpenHandoff(href, label, internalRoute)
            }
          />
        ))}
      </ul>
    </aside>
  );
}
