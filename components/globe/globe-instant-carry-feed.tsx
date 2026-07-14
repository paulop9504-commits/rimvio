"use client";

import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { CaptureSheetMemoryTriggerStage } from "@/components/globe/capture-sheet-memory-trigger-stage";
import { GlobeContextTriggerRecallCard } from "@/components/globe/globe-context-trigger-recall-card";
import { Shimmer } from "@/components/ui/shimmer";
import { useMediaBlobUrl } from "@/hooks/use-media-blob-url";
import { copy } from "@/lib/copy/human-ko";
import type { GlobeContextTrigger } from "@/lib/globe/context-triggers/globe-context-trigger-types";
import type { GlobeContextTriggerMediaPreview } from "@/lib/globe/context-triggers/globe-context-trigger-types";
import {
  buildInstantCarryFeed,
  type InstantCarryHero,
  type InstantCarryLens,
  type InstantCarryNearLane,
  type InstantCarryPoster,
} from "@/lib/globe/instant-carry";
import { requestGlobeComposeSeed } from "@/lib/globe/globe-compose-seed-bridge";
import type { GlobeResumeSession } from "@/lib/globe/globe-resume-session";
import { cn } from "@/lib/utils";

export type GlobeInstantCarryFeedProps = {
  showResume: boolean;
  resume: GlobeResumeSession | null;
  triggers: readonly GlobeContextTrigger[];
  onResumeSession: (session: GlobeResumeSession) => void;
  onDismissResume: () => void;
  onActivateTrigger: (trigger: GlobeContextTrigger) => void;
  className?: string;
};

function usePreviewSrc(media?: GlobeContextTriggerMediaPreview | null) {
  const { url: blobUrl, loading } = useMediaBlobUrl(
    media?.allowLocalBlob ? media.mediaContextId : null,
  );
  return {
    src: media?.imageUrl ?? blobUrl ?? null,
    loading: Boolean(media) && loading && !media?.imageUrl,
  };
}

function ContinuityHero({
  hero,
  onResume,
  onDismissResume,
  onActivateTrigger,
}: {
  hero: InstantCarryHero;
  onResume: (session: GlobeResumeSession) => void;
  onDismissResume: () => void;
  onActivateTrigger: (trigger: GlobeContextTrigger) => void;
}) {
  const previews = hero.trigger?.mediaPreviews ?? [];
  const primary = previews[0] ?? null;
  const secondary = previews[1] ?? null;
  const { src: primarySrc, loading: primaryLoading } = usePreviewSrc(primary);
  const { src: secondarySrc } = usePreviewSrc(secondary);

  const activate = () => {
    if (hero.kind === "resume" && hero.resume) {
      onResume(hero.resume);
      return;
    }
    if (hero.trigger) {
      onActivateTrigger(hero.trigger);
    }
  };

  return (
    <div
      className="relative overflow-hidden rounded-[1.35rem] bg-[#10141c] shadow-[0_10px_32px_rgba(2,32,71,0.18)] ring-1 ring-black/20"
      data-instant-carry-hero
    >
      <div className="absolute inset-0 opacity-90" aria-hidden>
        {primaryLoading && !primarySrc ? (
          <Shimmer className="size-full" />
        ) : primarySrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={primarySrc} alt="" className="size-full object-cover" />
        ) : (
          <div className="size-full bg-gradient-to-br from-[#2a3344] via-[#1a2030] to-[#0e1218]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/15" />
      </div>

      {secondarySrc ? (
        <div
          className="absolute right-3 top-3 z-10 size-[4.25rem] -rotate-6 overflow-hidden rounded-[0.85rem] bg-white p-0.5 shadow-lg ring-1 ring-white/70"
          aria-hidden
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={secondarySrc} alt="" className="size-full rounded-[0.7rem] object-cover" />
        </div>
      ) : null}

      <div className="relative z-10 flex flex-col gap-2.5 px-3.5 pb-3.5 pt-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">
          {copy.globe.instantCarryContinuityEyebrow}
        </p>
        <div>
          <h3 className="text-[17px] font-semibold leading-snug text-white">{hero.title}</h3>
          {hero.subtitle ? (
            <p className="mt-0.5 truncate text-[12px] text-white/75">{hero.subtitle}</p>
          ) : null}
        </div>

        {hero.tags.length > 0 ? (
          <p className="truncate text-[11px] text-white/60">{hero.tags.join(" · ")}</p>
        ) : null}

        <div
          className="h-1 overflow-hidden rounded-full bg-white/20"
          role="progressbar"
          aria-valuenow={Math.round(hero.progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={copy.globe.instantCarryProgressLabel}
        >
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${Math.round(hero.progress * 100)}%` }}
          />
        </div>

        <div className="mt-0.5 flex items-center gap-2">
          <button
            type="button"
            onClick={activate}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-white px-3 py-2 text-[13px] font-semibold text-[#10141c] active:scale-[0.98]"
          >
            {hero.kind === "resume"
              ? copy.globe.instantCarryContinueCta
              : copy.globe.instantCarryOpenTraceCta}
            <ChevronRight className="size-4" aria-hidden />
          </button>
          {hero.kind === "resume" ? (
            <button
              type="button"
              onClick={onDismissResume}
              className="shrink-0 rounded-full px-2.5 py-2 text-[12px] font-medium text-white/70 active:bg-white/10"
              aria-label={copy.globe.resumeContextDismiss}
            >
              ✕
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MeaningLaneRow({
  title,
  posters,
  onActivate,
}: {
  title: string;
  posters: readonly InstantCarryPoster[];
  onActivate: (trigger: GlobeContextTrigger) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-1.5" data-instant-carry-meaning-lane>
      <div className="flex items-baseline justify-between px-0.5">
        <p className="text-[11px] font-semibold text-foreground">
          {copy.globe.instantCarryMeaningEyebrow} · {title}
        </p>
      </div>
      <div className="flex gap-2 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {posters.map((poster) => (
          <div key={poster.id} className="w-[7.25rem] shrink-0">
            <GlobeContextTriggerRecallCard
              trigger={poster.trigger}
              active={false}
              compact
              onPress={() => onActivate(poster.trigger)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function NearLaneRow({
  lane,
  onActivate,
}: {
  lane: InstantCarryNearLane;
  onActivate: (trigger: GlobeContextTrigger) => void;
}) {
  const seed = () => {
    requestGlobeComposeSeed({ text: lane.seedQuery, source: "manual" });
  };

  return (
    <div className="flex w-full flex-col gap-1.5" data-instant-carry-near-lane>
      <div className="flex items-center justify-between gap-2 px-0.5">
        <p className="min-w-0 truncate text-[11px] font-semibold text-foreground">
          {copy.globe.instantCarryNearEyebrow} · {lane.title}
        </p>
        <button
          type="button"
          onClick={seed}
          className="shrink-0 rounded-full bg-foreground/90 px-2.5 py-1 text-[10px] font-semibold text-background active:scale-[0.98]"
        >
          {copy.globe.instantCarryNearSeedCta}
        </button>
      </div>
      {lane.posters.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {lane.posters.map((poster) => (
            <div key={poster.id} className="w-[7.25rem] shrink-0">
              <GlobeContextTriggerRecallCard
                trigger={poster.trigger}
                active={false}
                compact
                onPress={() => onActivate(poster.trigger)}
              />
            </div>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={seed}
          className="w-full rounded-[1rem] bg-[#141820] px-3 py-3 text-left active:scale-[0.99]"
        >
          <p className="text-[13px] font-semibold text-white">{lane.title}</p>
          <p className="mt-0.5 text-[11px] text-white/65">
            {copy.globe.instantCarryNearSeedHint(lane.entityLabel)}
          </p>
        </button>
      )}
    </div>
  );
}

function DenseMasonryStrip({
  posters,
  onActivate,
}: {
  posters: readonly InstantCarryPoster[];
  onActivate: (trigger: GlobeContextTrigger) => void;
}) {
  if (posters.length === 0) {
    return null;
  }

  return (
    <div className="flex w-full flex-col gap-1.5" data-instant-carry-dense>
      <p className="px-0.5 text-[11px] font-semibold text-muted-foreground">
        {copy.globe.instantCarryDenseEyebrow}
      </p>
      <div className="columns-2 gap-2 [column-fill:balance]">
        {posters.map((poster, index) => {
          const media = poster.trigger.mediaPreviews?.[0] ?? null;
          return (
            <DenseTile
              key={poster.id}
              poster={poster}
              media={media}
              tall={index % 3 === 0}
              onActivate={onActivate}
            />
          );
        })}
      </div>
    </div>
  );
}

function DenseTile({
  poster,
  media,
  tall,
  onActivate,
}: {
  poster: InstantCarryPoster;
  media: GlobeContextTriggerMediaPreview | null;
  tall: boolean;
  onActivate: (trigger: GlobeContextTrigger) => void;
}) {
  const { src, loading } = usePreviewSrc(media);

  return (
    <button
      type="button"
      onClick={() => onActivate(poster.trigger)}
      className={cn(
        "mb-2 w-full break-inside-avoid overflow-hidden rounded-[0.95rem] bg-[#141820] text-left ring-1 ring-black/10 active:scale-[0.99]",
        tall ? "min-h-[9.5rem]" : "min-h-[7.25rem]",
      )}
      data-instant-carry-dense-tile
    >
      <span className="relative block min-h-[inherit] w-full">
        {loading && !src ? (
          <Shimmer className="absolute inset-0" />
        ) : src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <span className="absolute inset-0 bg-gradient-to-br from-[#2c3648] to-[#151a22]" />
        )}
        <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
        <span className="absolute inset-x-0 bottom-0 z-10 p-2">
          <span className="line-clamp-2 text-[12px] font-semibold leading-snug text-white">
            {poster.hook}
          </span>
          {poster.meta ? (
            <span className="mt-0.5 block truncate text-[10px] text-white/65">{poster.meta}</span>
          ) : null}
        </span>
      </span>
    </button>
  );
}

const LENSES: readonly { id: InstantCarryLens; label: () => string }[] = [
  { id: "traces", label: () => copy.globe.instantCarryLensTraces },
  { id: "context", label: () => copy.globe.instantCarryLensContext },
  { id: "near", label: () => copy.globe.instantCarryLensNear },
  { id: "todo", label: () => copy.globe.instantCarryLensTodo },
];

/** Instant Carry — Netflix rows × IG density on Floor 1 memory dock. */
export function GlobeInstantCarryFeed({
  showResume,
  resume,
  triggers,
  onResumeSession,
  onDismissResume,
  onActivateTrigger,
  className,
}: GlobeInstantCarryFeedProps) {
  const [lens, setLens] = useState<InstantCarryLens>("traces");

  const model = useMemo(
    () =>
      buildInstantCarryFeed({
        showResume,
        resume,
        triggers,
        lens,
      }),
    [showResume, resume, triggers, lens],
  );

  if (
    !model.hero &&
    model.thenThere.length === 0 &&
    model.meaningLanes.length === 0 &&
    model.nearLanes.length === 0 &&
    model.dense.length === 0 &&
    lens !== "todo" &&
    lens !== "near"
  ) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-3 rounded-[1.2rem] bg-white/92 p-2.5 shadow-[0_8px_28px_rgba(2,32,71,0.1)] ring-1 ring-black/[0.05] backdrop-blur-xl",
        className,
      )}
      data-globe-instant-carry-feed
    >
      <div className="flex items-center gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {LENSES.map((row) => {
          const active = lens === row.id;
          return (
            <button
              key={row.id}
              type="button"
              onClick={() => setLens(row.id)}
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 transition-colors",
                active
                  ? "bg-foreground text-background ring-foreground"
                  : "bg-white/80 text-muted-foreground ring-black/[0.08]",
              )}
            >
              {row.label()}
            </button>
          );
        })}
      </div>

      {model.hero ? (
        <ContinuityHero
          hero={model.hero}
          onResume={onResumeSession}
          onDismissResume={onDismissResume}
          onActivateTrigger={onActivateTrigger}
        />
      ) : null}

      {model.thenThere.length > 0 ? (
        <div className="flex flex-col gap-1" data-instant-carry-then-there>
          <p className="px-0.5 text-[11px] font-semibold text-muted-foreground">
            {copy.globe.instantCarryThenThereEyebrow}
          </p>
          <CaptureSheetMemoryTriggerStage
            triggers={model.thenThere.map((row) => row.trigger)}
            onTriggerPress={onActivateTrigger}
            compact
            className="-mx-1"
          />
        </div>
      ) : null}

      {model.meaningLanes.map((lane) => (
        <MeaningLaneRow
          key={lane.id}
          title={lane.title}
          posters={lane.posters}
          onActivate={onActivateTrigger}
        />
      ))}

      {model.nearLanes.map((lane) => (
        <NearLaneRow key={lane.id} lane={lane} onActivate={onActivateTrigger} />
      ))}

      {lens !== "todo" && lens !== "near" && model.dense.length > 0 ? (
        <DenseMasonryStrip posters={model.dense} onActivate={onActivateTrigger} />
      ) : null}

      {lens === "todo" && !model.hero ? (
        <p className="px-1 py-2 text-center text-[12px] text-muted-foreground">
          {copy.globe.instantCarryTodoEmpty}
        </p>
      ) : null}

      {lens === "near" && model.nearLanes.length === 0 ? (
        <p className="px-1 py-2 text-center text-[12px] text-muted-foreground">
          {copy.globe.instantCarryNearEmpty}
        </p>
      ) : null}
    </div>
  );
}
