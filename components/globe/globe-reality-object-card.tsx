"use client";

/**
 * Reality Object Card — 알아두기 · 사진 · 근처 · 할 일.
 * Appears after Context Bloom reaches execution_ready (prep only).
 */

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { copy } from "@/lib/copy/human-ko";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { openFieldDashboardIngress } from "@/lib/nav/field-dashboard-ingress";
import {
  buildObjectCardModel,
  gatePlaceInfoActionsByCapabilities,
  resolveRealityObjectForCard,
} from "@/lib/reality-object";
import type { ObjectCardTabId } from "@/lib/reality-object/object-card-types";
import { cn } from "@/lib/utils";
import {
  clearContextBloom,
  isContextBloomExecutionReady,
  readContextBloomSession,
  subscribeContextBloom,
  type ContextBloomSessionLive,
} from "@/lib/visual-projection";
import {
  openBloomDirectionsUrl,
  runContextBloomAddToInbox,
} from "@/lib/visual-projection/run-context-bloom-execution";

export type GlobeRealityObjectCardProps = {
  fallbackContextEventId?: string | null;
  event?: EventCandidate | null;
  className?: string;
};

const TABS: {
  id: ObjectCardTabId;
  label: () => string;
}[] = [
  { id: "information", label: () => copy.globe.objectCardTabInfo },
  { id: "gallery", label: () => copy.globe.objectCardTabGallery },
  { id: "nearby", label: () => copy.globe.objectCardTabNearby },
  { id: "execution", label: () => copy.globe.objectCardTabExecution },
];

export function GlobeRealityObjectCard({
  fallbackContextEventId = null,
  event = null,
  className,
}: GlobeRealityObjectCardProps) {
  const [session, setSession] = useState<ContextBloomSessionLive | null>(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<ObjectCardTabId>("execution");

  useEffect(() => {
    const sync = () => {
      const next = readContextBloomSession();
      const execReady = isContextBloomExecutionReady();
      setSession(next);
      setReady(execReady);
      if (next && execReady) {
        setTab("execution");
      }
    };
    sync();
    return subscribeContextBloom(sync);
  }, []);

  const selected = session?.selected ?? null;
  const visible = Boolean(ready && selected);

  const model = useMemo(() => {
    if (!selected) {
      return null;
    }
    const object = resolveRealityObjectForCard({
      event,
      resourceId: selected.resourceId,
      placeId: selected.placeId,
    });
    return buildObjectCardModel({
      object,
      title: selected.label,
      pinKind: selected.pinKind,
      nearby: (session?.related ?? []).map((row) => ({
        id: row.id,
        label: row.label,
        pinKind: row.pinKind,
        score: row.score,
      })),
      executionReady: ready,
      preferredTab: "execution",
    });
  }, [event, ready, selected, session?.related]);

  useEffect(() => {
    if (model) {
      setTab(model.defaultTab);
    }
  }, [model?.title, model?.defaultTab]);

  const enqueueInbox = useCallback(() => {
    if (!selected) {
      return;
    }
    const result = runContextBloomAddToInbox({
      candidate: selected,
      fallbackContextEventId,
      reasonLinesKo: ["오브젝트 카드"],
    });
    if (!result.ok) {
      if (result.reason === "no_context") {
        toast.error("맥락을 먼저 열어 주세요");
      }
      return;
    }
    toast.message(copy.globe.intelligentPinAddInboxToast(selected.label));
    openFieldDashboardIngress({
      tab: "queue",
      primaryEventId: result.eventId,
    });
  }, [fallbackContextEventId, selected]);

  const openDirections = useCallback(() => {
    if (!selected) {
      return;
    }
    window.open(openBloomDirectionsUrl(selected), "_blank", "noopener,noreferrer");
    toast.message(copy.globe.placeActionGraphDirectionsToast);
  }, [selected]);

  const gated = model
    ? gatePlaceInfoActionsByCapabilities({
        capabilities: model.capabilities,
        handlers: {
          onDirections: openDirections,
          onReservePrep: enqueueInbox,
          onBookNow: enqueueInbox,
          onAddToExecutionInbox: enqueueInbox,
        },
      })
    : null;

  return (
    <AnimatePresence>
      {visible && selected && model ? (
        <motion.aside
          key={`object-card:${selected.id}`}
          initial={{ opacity: 0, y: 18, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.28, ease: [0.19, 1, 0.22, 1] }}
          className={cn(
            "pointer-events-auto w-[min(100%,19rem)] overflow-hidden rounded-2xl bg-white/96 shadow-[0_12px_32px_rgba(15,23,42,0.14)] ring-1 ring-black/[0.05] backdrop-blur-md",
            className,
          )}
          data-globe-reality-object-card
          data-object-card-tab={tab}
          aria-live="polite"
        >
          <header className="flex items-start gap-2.5 border-b border-black/[0.05] px-3.5 py-3">
            {model.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={model.coverImageUrl}
                alt=""
                className="h-11 w-11 shrink-0 rounded-xl object-cover"
                draggable={false}
              />
            ) : (
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f5f5f7] text-[11px] font-semibold text-[#8b95a1]"
                aria-hidden
              >
                {model.objectTypeLabelKo.slice(0, 2)}
              </span>
            )}
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8b95a1]">
                {copy.globe.objectCardEyebrow}
              </p>
              <h3 className="truncate text-[15px] font-bold tracking-tight text-[#191f28]">
                {model.title}
              </h3>
              <p className="truncate text-[11px] text-[#6b7684]">
                {model.objectTypeLabelKo}
                {model.ratingLabel ? ` · ${model.ratingLabel}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => clearContextBloom()}
              className="shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold text-[#8b95a1] active:opacity-70"
              aria-label={copy.globe.objectCardDismissAria}
              data-object-card-dismiss
            >
              ✕
            </button>
          </header>

          <nav
            className="flex gap-0.5 border-b border-black/[0.05] px-2 pt-1"
            aria-label={copy.globe.objectCardTabsAria}
            data-object-card-tabs
          >
            {TABS.map((row) => {
              const locked = row.id === "execution" && !model.executionReady;
              return (
                <button
                  key={row.id}
                  type="button"
                  disabled={locked}
                  onClick={() => setTab(row.id)}
                  className={cn(
                    "flex-1 rounded-t-lg px-1.5 py-2 text-[11px] font-semibold tracking-tight transition-colors",
                    tab === row.id
                      ? "bg-[#f5f5f7] text-[#191f28]"
                      : "text-[#8b95a1] hover:text-[#515154]",
                    locked && "opacity-40",
                  )}
                  data-object-card-tab-btn={row.id}
                  data-active={tab === row.id ? "1" : "0"}
                >
                  {row.label()}
                </button>
              );
            })}
          </nav>

          <div className="max-h-[11.5rem] overflow-y-auto px-3.5 py-3" data-object-card-body>
            {tab === "information" ? (
              <ul className="space-y-1.5" data-object-card-info>
                {model.facts.map((fact) => (
                  <li
                    key={fact.id}
                    className="text-[13px] leading-snug tracking-tight text-[#515154]"
                  >
                    {fact.labelKo}
                  </li>
                ))}
              </ul>
            ) : null}

            {tab === "gallery" ? (
              model.galleryUrls.length > 0 ? (
                <div
                  className="grid grid-cols-3 gap-1.5"
                  data-object-card-gallery
                >
                  {model.galleryUrls.map((url) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={url}
                      src={url}
                      alt=""
                      className="aspect-square rounded-lg object-cover"
                      draggable={false}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-[#8b95a1]">
                  {copy.globe.objectCardGalleryEmpty}
                </p>
              )
            ) : null}

            {tab === "nearby" ? (
              model.nearby.length > 0 ? (
                <ul className="space-y-2" data-object-card-nearby>
                  {model.nearby.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center justify-between gap-2 text-[13px] tracking-tight text-[#191f28]"
                    >
                      <span className="truncate font-medium">{row.label}</span>
                      {row.score != null ? (
                        <span className="shrink-0 text-[11px] font-semibold text-[#8b95a1]">
                          {row.score.toFixed(2)}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[12px] text-[#8b95a1]">
                  {copy.globe.objectCardNearbyEmpty}
                </p>
              )
            ) : null}

            {tab === "execution" && gated ? (
              <div className="space-y-2" data-object-card-execution>
                <p className="text-[12px] leading-snug text-[#6b7684]">
                  {copy.globe.contextBloomExecutionHint}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {gated.onDirections ? (
                    <button
                      type="button"
                      onClick={gated.onDirections}
                      className="rounded-full bg-[#f5f5f7] px-2.5 py-1.5 text-[11px] font-semibold text-[#1d1d1f] ring-1 ring-black/[0.04]"
                    >
                      {copy.globe.intelligentPinDirectionsCta}
                    </button>
                  ) : null}
                  {gated.onReservePrep ? (
                    <button
                      type="button"
                      onClick={gated.onReservePrep}
                      className="rounded-full bg-[#f5f5f7] px-2.5 py-1.5 text-[11px] font-semibold text-[#1d1d1f] ring-1 ring-black/[0.04]"
                    >
                      {copy.globe.intelligentPinReservePrepCta}
                    </button>
                  ) : null}
                  {gated.onBookNow ? (
                    <button
                      type="button"
                      onClick={gated.onBookNow}
                      className="rounded-full bg-[#0071e3] px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm"
                    >
                      {copy.globe.intelligentPinBookNowCta}
                    </button>
                  ) : null}
                  {gated.onAddToExecutionInbox ? (
                    <button
                      type="button"
                      onClick={gated.onAddToExecutionInbox}
                      className="rounded-full bg-[#191f28] px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm"
                    >
                      {copy.globe.intelligentPinAddInboxCta}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
