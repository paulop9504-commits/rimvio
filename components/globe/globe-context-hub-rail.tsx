"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plane, Plus } from "lucide-react";
import { toast } from "sonner";
import { connectDepartureHubToContext } from "@/lib/globe/connect-departure-hub-to-context";
import {
  listGlobeContextHubRailEntries,
  type GlobeContextHubRailEntry,
} from "@/lib/globe/context-hub/list-globe-context-hub-rail-entries";
import type { DepartureHubAirportId } from "@/lib/globe/departure-hub-airports";
import { suggestDepartureHubOptions } from "@/lib/globe/suggest-departure-hub-options";
import type { GlobeContextPeopleFilter } from "@/lib/globe/globe-context-people-filter";
import type { GlobeContextTimeFilter } from "@/lib/globe/globe-context-time-filter";
import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  EVENT_CANDIDATES_UPDATED,
  listLifeEventCandidates,
} from "@/lib/life-read-model";
import { PERSONAL_GLOBE_PINS_UPDATED } from "@/lib/globe/personal-globe-pin-store";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeContextHubRailProps = {
  activeEventId?: string | null;
  visible?: boolean;
  timeFilter?: GlobeContextTimeFilter;
  peopleFilter?: GlobeContextPeopleFilter;
  onFocusContext?: (eventId: string) => void;
  className?: string;
};

function placeInitial(place: string): string {
  const trimmed = place.trim();
  if (!trimmed) {
    return "✦";
  }
  return trimmed.slice(0, 1);
}

function HubRailCard({
  entry,
  active,
  connectOpen,
  busy,
  onFocus,
  onToggleConnect,
  onConnect,
  onOpenFlight,
}: {
  entry: GlobeContextHubRailEntry;
  active: boolean;
  connectOpen: boolean;
  busy: boolean;
  onFocus: () => void;
  onToggleConnect: () => void;
  onConnect: (airportId: DepartureHubAirportId) => void;
  onOpenFlight: (url: string) => void;
}) {
  const primaryLink = entry.hubLinks[0] ?? null;
  const hasHub = Boolean(primaryLink);
  const options = useMemo(
    () =>
      entry.canSuggestHub
        ? suggestDepartureHubOptions({ destinationPlace: entry.place })
        : [],
    [entry.canSuggestHub, entry.place],
  );

  return (
    <li className="relative flex flex-col items-center">
      <button
        type="button"
        onClick={onFocus}
        className={cn(
          "group relative size-[3.35rem] overflow-hidden rounded-[1rem] shadow-sm ring-1 transition active:scale-[0.96]",
          active
            ? "ring-2 ring-primary shadow-[0_8px_24px_rgba(49,130,246,0.28)]"
            : "ring-border/70 hover:ring-primary/35",
        )}
        aria-label={copy.globe.contextHubRailFocus(entry.place)}
        data-globe-hub-rail-context={entry.eventId}
      >
        {entry.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={entry.thumbnailUrl}
            alt=""
            className="size-full object-cover transition duration-300 group-hover:scale-105"
            draggable={false}
            referrerPolicy="no-referrer"
          />
        ) : (
          <span
            className="flex size-full items-center justify-center bg-gradient-to-br from-[#eef4ff] via-[#f7f9fc] to-[#e8f0ff] text-[1.1rem] font-bold text-primary"
            aria-hidden
          >
            {placeInitial(entry.place)}
          </span>
        )}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-1 pb-1 pt-4">
          <span className="block truncate text-center text-[8px] font-semibold text-white">
            {entry.place}
          </span>
        </span>
      </button>

      {hasHub ? (
        <button
          type="button"
          disabled={busy || !primaryLink?.actionUrl}
          onClick={(event) => {
            event.stopPropagation();
            if (primaryLink?.actionUrl) {
              onOpenFlight(primaryLink.actionUrl);
            }
          }}
          className={cn(
            "absolute -bottom-1 -right-1 z-10 flex min-w-[1.65rem] items-center justify-center gap-0.5 rounded-full border-2 border-white bg-primary px-1 py-0.5 text-[8px] font-bold text-primary-foreground shadow-[0_2px_10px_rgba(49,130,246,0.35)]",
            !primaryLink?.actionUrl && "opacity-70",
          )}
          aria-label={copy.globe.contextHubOpenFlight}
          data-globe-hub-rail-flight={entry.eventId}
        >
          <Plane className="size-2.5" aria-hidden />
          <span>{primaryLink?.airportIata ?? "✈"}</span>
        </button>
      ) : entry.canSuggestHub ? (
        <button
          type="button"
          disabled={busy}
          onClick={(event) => {
            event.stopPropagation();
            onToggleConnect();
          }}
          className={cn(
            "absolute -bottom-1 -right-1 z-10 flex size-[1.65rem] items-center justify-center rounded-full border-2 border-white bg-card text-primary shadow-[0_2px_10px_rgba(2,32,71,0.12)] ring-1 ring-primary/25",
            connectOpen && "bg-primary text-primary-foreground ring-primary",
          )}
          aria-label={copy.globe.contextHubRailConnect(entry.place)}
          aria-expanded={connectOpen}
          data-globe-hub-rail-add={entry.eventId}
        >
          <Plus className="size-3.5 stroke-[2.5]" aria-hidden />
        </button>
      ) : null}

      <AnimatePresence initial={false}>
        {connectOpen && options.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, x: -6, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -6, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute left-[calc(100%+0.45rem)] top-1/2 z-30 w-[8.5rem] -translate-y-1/2 overflow-hidden rounded-[1rem] border border-border/70 bg-card/98 p-1 shadow-[0_12px_40px_rgba(2,32,71,0.14)] backdrop-blur-xl"
            data-globe-hub-rail-picker={entry.eventId}
          >
            <p className="px-2 pb-1 pt-1.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
              {copy.globe.contextHubRailPickAirport}
            </p>
            <ul className="space-y-0.5">
              {options.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onConnect(option.id)}
                    className="flex w-full items-center justify-between rounded-[0.75rem] px-2 py-1.5 text-left active:bg-muted/70"
                    data-globe-hub-rail-option={option.id}
                  >
                    <span className="text-[11px] font-semibold text-foreground">
                      {option.shortLabelKo}
                    </span>
                    {option.recommended ? (
                      <span className="rounded-full bg-primary/12 px-1.5 py-0.5 text-[8px] font-bold text-primary">
                        {copy.globe.departureHubRecommended}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
}

export function GlobeContextHubRail({
  activeEventId,
  visible = true,
  timeFilter = "all",
  peopleFilter = null,
  onFocusContext,
  className,
}: GlobeContextHubRailProps) {
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [connectEventId, setConnectEventId] = useState<string | null>(null);

  useEffect(() => {
    const bump = () => setRevision((value) => value + 1);
    window.addEventListener(EVENT_CANDIDATES_UPDATED, bump);
    window.addEventListener(PERSONAL_GLOBE_PINS_UPDATED, bump);
    return () => {
      window.removeEventListener(EVENT_CANDIDATES_UPDATED, bump);
      window.removeEventListener(PERSONAL_GLOBE_PINS_UPDATED, bump);
    };
  }, []);

  const entries = useMemo(() => {
    void revision;
    const events = listLifeEventCandidates();
    const eventsById = new Map<string, EventCandidate>(
      events.map((event) => [event.id, event]),
    );
    return listGlobeContextHubRailEntries({
      events,
      eventsById,
      timeFilter,
      peopleFilter,
    });
  }, [peopleFilter, revision, timeFilter]);

  const handleConnect = useCallback(
    async (entry: GlobeContextHubRailEntry, airportId: DepartureHubAirportId) => {
      if (busy) {
        return;
      }
      setBusy(true);
      try {
        connectDepartureHubToContext({
          destinationEventId: entry.eventId,
          airportId,
        });
        const label =
          suggestDepartureHubOptions({ destinationPlace: entry.place }).find(
            (row) => row.id === airportId,
          )?.shortLabelKo ?? airportId;
        toast.success(copy.globe.departureHubConnected(label));
        setConnectEventId(null);
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
    [busy],
  );

  if (!visible || entries.length === 0) {
    return null;
  }

  return (
    <aside
      className={cn(
        "pointer-events-auto flex w-[4.35rem] flex-col overflow-hidden rounded-[1.25rem] border border-white/60 bg-card/88 shadow-[0_8px_32px_rgba(2,32,71,0.1)] backdrop-blur-xl ring-1 ring-border/50",
        className,
      )}
      data-globe-context-hub-rail
      aria-label={copy.globe.contextHubRailTitle}
    >
      <div className="border-b border-border/50 px-2 py-2 text-center">
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-primary">
          {copy.globe.contextHubEyebrow}
        </p>
        <p className="text-[11px] font-semibold leading-tight text-foreground">
          {copy.globe.contextHubRailTitle}
        </p>
      </div>

      <ul className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-2 py-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {entries.map((entry) => (
          <HubRailCard
            key={entry.eventId}
            entry={entry}
            active={activeEventId === entry.eventId}
            connectOpen={connectEventId === entry.eventId}
            busy={busy}
            onFocus={() => {
              setConnectEventId(null);
              onFocusContext?.(entry.eventId);
            }}
            onToggleConnect={() =>
              setConnectEventId((current) =>
                current === entry.eventId ? null : entry.eventId,
              )
            }
            onConnect={(airportId) => void handleConnect(entry, airportId)}
            onOpenFlight={(url) => {
              window.open(url, "_blank", "noopener,noreferrer");
            }}
          />
        ))}
      </ul>
    </aside>
  );
}
