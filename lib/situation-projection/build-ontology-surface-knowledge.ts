import { resolveStableContextPlaceAnchor } from "@/lib/context-instance/build-context-instance";
import { CURATED_TRAVEL_KNOWLEDGE } from "@/lib/globe/knowledge/curated-travel-knowledge";
import type { CountryCode } from "@/lib/links/spark-locale";
import { queryMediaGuidesForEvent } from "@/lib/ontology/media-guide-store";
import type { MediaGuideNode } from "@/lib/ontology/media-guide-types";
import type {
  BrainSurfaceCandidateFamily,
  BrainSurfaceProjectionCandidate,
} from "@/lib/situation-projection/brain-surface-types";
import type {
  EventCandidate,
} from "@/lib/events/event-candidate";
import type { SituationProjectionManifest } from "@/lib/situation-projection/types";

type KnowledgeCandidate = BrainSurfaceProjectionCandidate;

function normalizeText(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/gu, " ") ?? "";
}

function normalizeCompact(value: string | null | undefined): string {
  return normalizeText(value).toLowerCase().replace(/\s+/gu, "");
}

function mapGuideEvidenceKind(
  trustLevel: MediaGuideNode["trustLevel"],
): KnowledgeCandidate["evidenceKind"] {
  switch (trustLevel) {
    case "official":
      return "official";
    case "guide":
      return "guide";
    case "video":
      return "video";
    case "public":
    default:
      return "public";
  }
}

function formatValidMonthsLabel(validMonths: readonly number[] | undefined): string | null {
  if (!validMonths?.length) {
    return null;
  }
  const unique = [...new Set(validMonths)].sort((left, right) => left - right);
  if (unique.length === 1) {
    return `${unique[0]}월 흐름`;
  }
  const contiguous = unique.every((month, index) =>
    index === 0 ? true : month === unique[index - 1]! + 1,
  );
  if (contiguous) {
    return `${unique[0]}-${unique[unique.length - 1]}월 흐름`;
  }
  return `${unique.map((month) => `${month}월`).join(" · ")}`;
}

function buildGuideInfoCandidates(input: {
  event: EventCandidate;
  guides: readonly MediaGuideNode[];
  anchorLabel: string;
}): KnowledgeCandidate[] {
  const candidates: KnowledgeCandidate[] = [];
  for (const guide of input.guides) {
    for (const inferred of guide.inferredPlaceCandidates) {
      if (inferred.semanticType !== "info") {
        continue;
      }
      const title = normalizeText(inferred.label) || normalizeText(guide.title);
      if (!title) {
        continue;
      }
      candidates.push({
        id: `brain-surface:${input.event.id}:guide:${guide.guideNodeId}:${inferred.candidateId}`,
        eventId: input.event.id,
        nodeId: null,
        family: "info",
        clusterId: `guide:${guide.guideNodeId}`,
        focusAffinityFamilies: ["media", "lodging", "eatery", "info", "event", "memo"],
        label: title,
        previewTitle: title,
        previewBody:
          normalizeText(inferred.whyCandidateKo) ||
          normalizeText(inferred.snippetKo) ||
          normalizeText(guide.whyRelevantKo) ||
          null,
        placeLabel: normalizeText(inferred.areaLabel) || input.anchorLabel,
        lat: inferred.lat ?? Number.NaN,
        lng: inferred.lng ?? Number.NaN,
        accent: guide.sourceKind === "youtube" ? "purple" : "blue",
        badgeLabelKo: inferred.semanticTypeLabelKo || "정보",
        relationMemoKo: normalizeText(inferred.whyCandidateKo) || null,
        sourceLabelKo: `${guide.sourceLabelKo} · ${guide.trustLabelKo}`,
        validityLabelKo: null,
        evidenceKind: mapGuideEvidenceKind(guide.trustLevel),
        primaryActionLabelKo:
          guide.sourceKind === "youtube" ? "바로 보기" : "가이드 열기",
        openUrl: normalizeText(guide.openUrl) || null,
        embedUrl: normalizeText(guide.embedUrl) || null,
        mapsUrl: null,
        searchQuery: normalizeText(inferred.searchProfile.query) || null,
        sourceGuideNodeId: guide.guideNodeId,
        revealOrder: 0,
        virtualCandidate: true,
        memoCommitDraft: null,
      });
    }
  }
  return candidates;
}

function scoreCuratedKnowledge(input: {
  item: (typeof CURATED_TRAVEL_KNOWLEDGE)[number];
  placeBlob: string;
  countryCode: string | null;
  referenceMonth: number;
  manifest: SituationProjectionManifest;
}): number {
  const monthActive =
    !input.item.validMonths?.length ||
    input.item.validMonths.includes(input.referenceMonth);
  if (!monthActive) {
    return -1;
  }

  const countryMatch =
    input.countryCode != null &&
    input.item.countryCodes.includes(input.countryCode as CountryCode);
  const cityMatch =
    !input.item.cityTokens?.length ||
    input.item.cityTokens.some((token) => input.placeBlob.includes(normalizeCompact(token)));

  if (input.item.cityTokens?.length && !cityMatch) {
    return -1;
  }

  if (!countryMatch && !cityMatch) {
    return -1;
  }

  let score = 0;
  if (countryMatch) {
    score += 100;
  }
  if (cityMatch) {
    score += 45;
  }

  const slots = input.manifest.travelBrain?.state.slots;
  if (slots) {
    if (input.item.tags.includes(slots.info_need_bias.value)) {
      score += 28;
    }
    if (
      input.item.tags.includes("photo") &&
      (slots.content_intent.value === "photo" || slots.content_intent.value === "mixed")
    ) {
      score += 16;
    }
    if (
      input.item.tags.includes("route") &&
      (slots.decision_confidence.value === "exploring" ||
        slots.decision_confidence.value === "narrowing")
    ) {
      score += 12;
    }
  }

  return score;
}

function buildCuratedKnowledgeCandidates(input: {
  event: EventCandidate;
  manifest: SituationProjectionManifest;
  anchorLabel: string;
  countryCode: string | null;
  placeBlob: string;
  referenceMonth: number;
}): KnowledgeCandidate[] {
  return CURATED_TRAVEL_KNOWLEDGE.map((item) => ({
    item,
    score: scoreCuratedKnowledge({
      item,
      placeBlob: input.placeBlob,
      countryCode: input.countryCode,
      referenceMonth: input.referenceMonth,
      manifest: input.manifest,
    }),
  }))
    .filter((entry) => entry.score >= 100)
    .sort((left, right) => right.score - left.score)
    .map(({ item }) => ({
      id: `brain-surface:${input.event.id}:knowledge:${item.id}`,
      eventId: input.event.id,
      nodeId: null,
      family: item.family,
      clusterId: `knowledge:${item.family}`,
      focusAffinityFamilies:
        item.focusAffinityFamilies ?? ["lodging", "eatery", "info", "event", "memo"],
      label: item.title,
      previewTitle: item.title,
      previewBody: item.summaryKo,
      placeLabel: input.anchorLabel,
      lat: Number.NaN,
      lng: Number.NaN,
      accent: item.family === "event" ? "orange" : "blue",
      badgeLabelKo: item.badgeLabelKo,
      relationMemoKo: item.summaryKo,
      sourceLabelKo: item.sourceLabelKo,
      validityLabelKo: formatValidMonthsLabel(item.validMonths),
      evidenceKind: item.evidenceKind,
      primaryActionLabelKo:
        item.family === "event" ? "행사 보기" : "가이드 열기",
      openUrl: item.sourceUrl,
      embedUrl: null,
      mapsUrl: null,
      searchQuery: `${input.anchorLabel} ${item.title}`,
      sourceGuideNodeId: null,
      revealOrder: 0,
      virtualCandidate: true,
      memoCommitDraft: null,
    }));
}

export function buildOntologySurfaceKnowledge(input: {
  event: EventCandidate;
  manifest: SituationProjectionManifest;
  guides?: readonly MediaGuideNode[];
  now?: Date;
}): KnowledgeCandidate[] {
  const anchor = resolveStableContextPlaceAnchor(input.event);
  const placeBlob = normalizeCompact(
    [anchor.label, input.event.place, input.event.title].filter(Boolean).join(" "),
  );
  const referenceDate = input.event.datetime?.trim()
    ? new Date(input.event.datetime)
    : input.now ?? new Date();
  const referenceMonth = Number.isNaN(referenceDate.getTime())
    ? (input.now ?? new Date()).getMonth() + 1
    : referenceDate.getMonth() + 1;
  const guides =
    input.guides && input.guides.length > 0
      ? input.guides
      : queryMediaGuidesForEvent(input.event.id, { max: 4 });

  const guideCandidates = buildGuideInfoCandidates({
    event: input.event,
    guides,
    anchorLabel: anchor.label,
  });

  const curatedCandidates =
    input.event.category === "travel"
      ? buildCuratedKnowledgeCandidates({
          event: input.event,
          manifest: input.manifest,
          anchorLabel: anchor.label,
          countryCode: anchor.profile.countryCode ?? null,
          placeBlob,
          referenceMonth,
        })
      : [];

  return [...guideCandidates, ...curatedCandidates];
}
