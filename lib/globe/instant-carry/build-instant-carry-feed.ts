import type { GlobeContextTrigger } from "@/lib/globe/context-triggers/globe-context-trigger-types";
import type { GlobeResumeSession } from "@/lib/globe/globe-resume-session";
import { buildInstantCarryNearLanes } from "@/lib/globe/instant-carry/build-instant-carry-near-lanes";
import type {
  InstantCarryFeedModel,
  InstantCarryHero,
  InstantCarryLens,
  InstantCarryMeaningLane,
  InstantCarryPoster,
} from "@/lib/globe/instant-carry/types";

const RESUME_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 3;

function posterFromTrigger(trigger: GlobeContextTrigger): InstantCarryPoster {
  const hook = trigger.body?.trim() || trigger.title?.trim() || "그때 거기";
  const metaParts: string[] = [];
  if (trigger.kind === "person_recall" && trigger.personKey?.trim()) {
    metaParts.push(trigger.personKey.trim());
  }
  if (trigger.kind === "travel_recall") {
    metaParts.push("여행");
  }
  if (trigger.kind === "time_recall") {
    metaParts.push("그날");
  }
  return {
    id: trigger.id,
    trigger,
    hook,
    meta: metaParts.length ? metaParts.join(" · ") : null,
  };
}

function resumeProgress(session: GlobeResumeSession, nowMs: number): number {
  const age = nowMs - Date.parse(session.updatedAtIso);
  if (!Number.isFinite(age) || age < 0) {
    return 0.5;
  }
  const ratio = Math.min(1, Math.max(0, age / RESUME_MAX_AGE_MS));
  const kindBoost = session.kind === "market" ? 0.08 : session.kind === "context" ? 0.04 : 0;
  return Math.min(0.92, 0.28 + (1 - ratio) * 0.52 + kindBoost);
}

function buildHero(input: {
  showResume: boolean;
  resume: GlobeResumeSession | null;
  triggers: readonly GlobeContextTrigger[];
  nowMs: number;
}): InstantCarryHero | null {
  if (input.showResume && input.resume) {
    const place = input.resume.placeLabel?.trim() || null;
    const tags = [
      input.resume.kind === "market" ? "맞춤" : "맥락",
      place,
    ].filter((row): row is string => Boolean(row));
    return {
      kind: "resume",
      title: input.resume.title.trim() || "이어갈 맥락",
      subtitle: place,
      progress: resumeProgress(input.resume, input.nowMs),
      tags,
      resume: input.resume,
      trigger: null,
    };
  }

  const richest = [...input.triggers].sort((a, b) => {
    const aN = a.mediaPreviews?.length ?? 0;
    const bN = b.mediaPreviews?.length ?? 0;
    return bN - aN;
  })[0];
  if (!richest) {
    return null;
  }
  return {
    kind: "trigger",
    title: richest.title.trim() || "그때 거기",
    subtitle: richest.body?.trim() || null,
    progress: Math.min(0.75, 0.32 + (richest.mediaPreviews?.length ?? 0) * 0.1),
    tags: [richest.ctaLabel?.trim() || "흔적"].filter(Boolean),
    resume: null,
    trigger: richest,
  };
}

function extractPlaceToken(trigger: GlobeContextTrigger): string | null {
  const blob = `${trigger.title} ${trigger.body}`;
  const match = blob.match(
    /([가-힣A-Za-z0-9]{2,12}(?:역|동|구|시|공항|공원|타워|거리|해변|촌|항))/,
  );
  return match?.[1]?.trim() || null;
}

function buildMeaningLanes(
  posters: readonly InstantCarryPoster[],
): InstantCarryMeaningLane[] {
  const byPlace = new Map<string, InstantCarryPoster[]>();
  const byKind = new Map<string, InstantCarryPoster[]>();

  for (const poster of posters) {
    const place = extractPlaceToken(poster.trigger);
    if (place) {
      const list = byPlace.get(place) ?? [];
      list.push(poster);
      byPlace.set(place, list);
      continue;
    }
    const kindTitle =
      poster.trigger.kind === "travel_recall"
        ? "여행 흔적"
        : poster.trigger.kind === "person_recall"
          ? "사람과 함께"
          : poster.trigger.kind === "time_recall"
            ? "그날의 순간"
            : "같은 결";
    const list = byKind.get(kindTitle) ?? [];
    list.push(poster);
    byKind.set(kindTitle, list);
  }

  const lanes: InstantCarryMeaningLane[] = [];
  for (const [title, items] of byPlace) {
    if (items.length >= 2) {
      lanes.push({ id: `place:${title}`, title, posters: items.slice(0, 8) });
    }
  }
  for (const [title, items] of byKind) {
    if (items.length >= 2) {
      lanes.push({ id: `kind:${title}`, title, posters: items.slice(0, 8) });
    }
  }
  return lanes.slice(0, 3);
}

export function buildInstantCarryFeed(input: {
  showResume: boolean;
  resume: GlobeResumeSession | null;
  triggers: readonly GlobeContextTrigger[];
  lens?: InstantCarryLens;
  nowMs?: number;
}): InstantCarryFeedModel {
  const nowMs = input.nowMs ?? Date.now();
  const lens = input.lens ?? "traces";

  const hero = buildHero({
    showResume: input.showResume,
    resume: input.resume,
    triggers: input.triggers,
    nowMs,
  });

  let triggers = [...input.triggers];
  if (hero?.kind === "trigger" && hero.trigger) {
    triggers = triggers.filter((row) => row.id !== hero.trigger!.id);
  }

  const nearLanes = buildInstantCarryNearLanes({
    showResume: input.showResume,
    resume: input.resume,
    triggers: input.triggers,
    nowMs,
  });

  if (lens === "todo") {
    const resumeOnly = Boolean(input.showResume && input.resume);
    return {
      hero: resumeOnly ? hero : null,
      thenThere: [],
      meaningLanes: [],
      nearLanes: [],
      dense: [],
    };
  }

  if (lens === "near") {
    return {
      hero,
      thenThere: [],
      meaningLanes: [],
      nearLanes,
      dense: [],
    };
  }

  const posters = triggers.map(posterFromTrigger);

  if (lens === "context") {
    return {
      hero,
      thenThere: [],
      meaningLanes: buildMeaningLanes(posters),
      nearLanes,
      dense: posters.slice(0, 9),
    };
  }

  // traces (default): full Instant Carry
  return {
    hero,
    thenThere: posters.slice(0, 8),
    meaningLanes: buildMeaningLanes(posters),
    nearLanes,
    dense: posters.slice(0, 12),
  };
}
