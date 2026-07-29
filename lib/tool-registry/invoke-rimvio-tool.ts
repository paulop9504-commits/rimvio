/**
 * Tool Registry — Intent/Planner know tool ids; implementations live here.
 * Adding a tool does not retrain the model.
 */

import { runPlaceSearch, runPlaceSearchAsync } from "@/lib/search-engine";
import {
  applyFieldControlToPlaceHits,
  bookingControlToToolMeta,
  compileContextFieldControl,
  type ContextFieldControlPlane,
} from "@/lib/context-field";
import { mergeLodgingStayForToolInvoke } from "@/lib/context-builder/resolve-lodging-stay-for-tools";
import { rankByValueConsensus } from "@/lib/search-engine/score-value-consensus";
import { composeAmenityLookupQuery } from "@/lib/tool-registry/amenity-lookup-cue";
import {
  formatLookupCountSummaryKo,
  withToolBudget,
} from "@/lib/tool-registry/with-tool-budget";
import {
  browseOffersToPlaceHits,
  runBrowseExtract,
} from "@/lib/tool-registry/browse-extract";
import {
  buildMapsNavigateUrl,
  travelModeFromUtterance,
} from "@/lib/tool-registry/maps-navigate";
import { enqueueCalendarPrepOperation } from "@/lib/reality-queue/enqueue-calendar-prep-operation";

export const RIMVIO_TOOL_IDS = [
  "maps.search",
  "maps.navigate",
  "hotel.lookup",
  "restaurant.lookup",
  "pharmacy.lookup",
  "browse.extract",
  "ranking.pick",
  "booking.prepare",
  "calendar.add",
] as const;

export type RimvioToolId = (typeof RIMVIO_TOOL_IDS)[number];

export type RimvioToolDefinition = {
  readonly id: RimvioToolId;
  readonly labelKo: string;
  /** Skill packs that may load this tool. */
  readonly skills: readonly ("travel" | "restaurant" | "finance" | "maps")[];
};

export type ToolInvokeInput = {
  readonly query?: string;
  readonly labels?: readonly string[];
  readonly domain?: "lodging" | "eatery" | "poi";
  readonly candidates?: readonly {
    readonly id: string;
    readonly labelKo: string;
    readonly rating?: number | null;
    readonly walkMinutes?: number | null;
    readonly priceBand?: number | null;
    readonly reservable?: boolean | null;
    readonly localFavorite?: boolean | null;
    readonly lat?: number | null;
    readonly lng?: number | null;
    readonly source?: string | null;
    readonly liteapiOfferId?: string | null;
    readonly liteapiHotelId?: string | null;
    readonly amountLabel?: string | null;
    /** Live review volume — consensus quality signal. */
    readonly reviewCount?: number | null;
    /** Nightly / ticket price KRW when known. */
    readonly priceKrw?: number | null;
  }[];
  readonly contextEventId?: string;
  readonly contextLabelKo?: string | null;
  readonly placeId?: string;
  readonly placeName?: string;
  readonly lat?: number | null;
  readonly lng?: number | null;
  /** Utterance for Context Field compile (search / rank / booking control). */
  readonly utterance?: string | null;
  /** Precompiled control plane — wins over utterance when both set. */
  readonly fieldControl?: ContextFieldControlPlane | null;
  /** Open lodging Diff stay — forwarded to LiteAPI / booking.prepare. */
  readonly checkInIso?: string | null;
  readonly checkOutIso?: string | null;
  readonly guestCount?: number | null;
};

export type ToolInvokeResult = {
  readonly ok: true;
  readonly toolId: RimvioToolId;
  readonly summaryKo: string;
  readonly pickedId?: string | null;
  readonly pickedLabelKo?: string | null;
  readonly candidates?: ToolInvokeInput["candidates"];
  readonly mapsUrl?: string | null;
  readonly reservedOpIds?: readonly string[];
  readonly waitingCommit?: boolean;
  readonly meta?: Readonly<Record<string, string | number | boolean | null>>;
};

const TOOLS: readonly RimvioToolDefinition[] = [
  {
    id: "maps.search",
    labelKo: "지도 찾기",
    skills: ["maps", "travel"],
  },
  {
    id: "maps.navigate",
    labelKo: "길찾기",
    skills: ["maps", "travel"],
  },
  {
    id: "hotel.lookup",
    labelKo: "숙소 찾기",
    skills: ["travel"],
  },
  {
    id: "restaurant.lookup",
    labelKo: "맛집 찾기",
    skills: ["restaurant", "travel"],
  },
  {
    id: "pharmacy.lookup",
    labelKo: "편의 찾기",
    skills: ["maps", "travel"],
  },
  {
    id: "browse.extract",
    labelKo: "사이트 브라우징",
    skills: ["travel", "maps"],
  },
  {
    id: "ranking.pick",
    labelKo: "순위 고르기",
    skills: ["travel", "restaurant"],
  },
  {
    id: "booking.prepare",
    labelKo: "예약 준비",
    skills: ["travel", "finance"],
  },
  {
    id: "calendar.add",
    labelKo: "일정 넣기",
    skills: ["travel", "maps"],
  },
];

export function listRimvioTools(): readonly RimvioToolDefinition[] {
  return TOOLS;
}

export function getRimvioTool(id: string): RimvioToolDefinition | null {
  return TOOLS.find((row) => row.id === id) ?? null;
}

export function listToolsForSkill(
  skill: RimvioToolDefinition["skills"][number],
): readonly RimvioToolDefinition[] {
  return TOOLS.filter((row) => row.skills.includes(skill));
}

function hitsToCandidates(
  hits: readonly {
    id: string;
    labelKo: string;
    rating: number | null;
    walkMinutes: number | null;
    priceBand: number | null;
    reservable: boolean;
    localFavorite: boolean;
    lat: number;
    lng: number;
    source: string;
    liteapiOfferId?: string | null;
    liteapiHotelId?: string | null;
    amountLabel?: string | null;
    reviewCount?: number | null;
    priceKrw?: number | null;
  }[],
): NonNullable<ToolInvokeInput["candidates"]> {
  return hits.map((hit) => ({
    id: hit.id,
    labelKo: hit.labelKo,
    rating: hit.rating,
    walkMinutes: hit.walkMinutes,
    priceBand: hit.priceBand,
    reservable: hit.reservable,
    localFavorite: hit.localFavorite,
    lat: hit.lat,
    lng: hit.lng,
    source: hit.source,
    liteapiOfferId: hit.liteapiOfferId ?? null,
    liteapiHotelId: hit.liteapiHotelId ?? null,
    amountLabel: hit.amountLabel ?? null,
    reviewCount: hit.reviewCount ?? null,
    priceKrw: hit.priceKrw ?? null,
  }));
}

function resolveFieldControl(
  input: ToolInvokeInput,
): ContextFieldControlPlane | null {
  if (input.fieldControl) {
    return input.fieldControl;
  }
  const utterance = input.utterance?.trim() || input.query?.trim() || "";
  if (!utterance) {
    return null;
  }
  return compileContextFieldControl(utterance);
}

function placeSearchCandidates(
  domain: "lodging" | "eatery" | "poi",
  input: ToolInvokeInput,
): NonNullable<ToolInvokeInput["candidates"]> {
  const plane = resolveFieldControl(input);
  const stay =
    domain === "lodging"
      ? mergeLodgingStayForToolInvoke({
          contextEventId: input.contextEventId,
          checkInIso: input.checkInIso,
          checkOutIso: input.checkOutIso,
          guestCount: input.guestCount,
        })
      : null;
  const hits = runPlaceSearch({
    query: input.query?.trim() || input.labels?.[0] || domain,
    domain,
    labels: input.labels,
    anchorLat: input.lat,
    anchorLng: input.lng,
    fieldSearch: plane?.search ?? null,
    checkInIso: stay?.checkInIso,
    checkOutIso: stay?.checkOutIso,
    guestCount: stay?.guestCount,
  });
  return hitsToCandidates(rankByValueConsensus(hits));
}

async function placeSearchCandidatesAsync(
  domain: "lodging" | "eatery" | "poi",
  input: ToolInvokeInput,
): Promise<NonNullable<ToolInvokeInput["candidates"]>> {
  const plane = resolveFieldControl(input);
  const stay =
    domain === "lodging"
      ? mergeLodgingStayForToolInvoke({
          contextEventId: input.contextEventId,
          checkInIso: input.checkInIso,
          checkOutIso: input.checkOutIso,
          guestCount: input.guestCount,
        })
      : null;
  const hits = await runPlaceSearchAsync({
    query: input.query?.trim() || input.labels?.[0] || domain,
    domain,
    labels: input.labels,
    anchorLat: input.lat,
    anchorLng: input.lng,
    fieldSearch: plane?.search ?? null,
    checkInIso: stay?.checkInIso,
    checkOutIso: stay?.checkOutIso,
    guestCount: stay?.guestCount,
  });
  return hitsToCandidates(rankByValueConsensus(hits));
}

function rankingPickResult(
  toolId: RimvioToolId,
  input: ToolInvokeInput,
): ToolInvokeResult {
  const plane = resolveFieldControl(input);
  let list = [...(input.candidates ?? [])];
  if (plane) {
    const filtered = applyFieldControlToPlaceHits(list, plane.search);
    // Soft budget (가성비) must not wipe the working set — consensus ranks value.
    list = filtered.length > 0 ? filtered : list;
  }
  // Consensus 가성비 — not localFavorite-first / seed-index order.
  list = rankByValueConsensus(list);
  if (plane?.booking.preferReservable) {
    list = [...list].sort((a, b) => {
      const reservable =
        Number(b.reservable !== false) - Number(a.reservable !== false);
      if (reservable !== 0) {
        return reservable;
      }
      return 0;
    });
  }
  const picked = list.find((row) => row.reservable !== false) ?? list[0] ?? null;
  if (!picked) {
    return {
      ok: true,
      toolId,
      summaryKo: "고를 후보가 없어요",
      pickedId: null,
      pickedLabelKo: null,
      candidates: list,
      ...(plane
        ? { meta: bookingControlToToolMeta(plane.booking) }
        : {}),
    };
  }

  const whyParts: string[] = [];
  if (typeof picked.rating === "number" && picked.rating > 0) {
    whyParts.push(`평점 ${picked.rating.toFixed(1)}`);
  }
  if (typeof picked.walkMinutes === "number" && picked.walkMinutes >= 0) {
    whyParts.push(`도보 ${picked.walkMinutes}분`);
  }
  if (typeof picked.priceBand === "number" && picked.priceBand > 0) {
    whyParts.push(`가격대 ${picked.priceBand}`);
  }
  if (picked.localFavorite === true) {
    whyParts.push("현지 추천");
  }
  if (picked.reservable !== false && list.some((r) => r.reservable === false)) {
    whyParts.push("예약 가능");
  }
  const why = whyParts.length > 0 ? ` (${whyParts.join(" · ")})` : "";

  return {
    ok: true,
    toolId,
    summaryKo: `${picked.labelKo}을 골랐어요${why}`,
    pickedId: picked.id ?? null,
    pickedLabelKo: picked.labelKo ?? null,
    candidates: list,
    ...(plane
      ? { meta: bookingControlToToolMeta(plane.booking) }
      : {}),
  };
}

/**
 * Deterministic tool invoke — no LLM. booking.prepare is prepare-only (caller commits).
 * Sync path uses seed/catalog; prefer invokeRimvioToolAsync for live Maps/LiteAPI.
 */
export function invokeRimvioTool(
  toolId: RimvioToolId,
  input: ToolInvokeInput = {},
): ToolInvokeResult {
  const def = getRimvioTool(toolId);
  if (!def) {
    return {
      ok: true,
      toolId,
      summaryKo: "도구를 찾지 못했어요",
    };
  }

  if (toolId === "maps.search") {
    const domain = input.domain ?? "poi";
    const candidates = placeSearchCandidates(domain, input);
    return {
      ok: true,
      toolId,
      summaryKo: formatLookupCountSummaryKo("지도", candidates.length),
      candidates,
    };
  }

  if (toolId === "maps.navigate") {
    const lat = input.lat;
    const lng = input.lng;
    const label = input.placeName?.trim() || input.query?.trim() || "목적지";
    if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return {
        ok: true,
        toolId,
        summaryKo: "길찾을 좌표가 없어요",
        mapsUrl: null,
        meta: { handoff: "maps_directions", missingCoords: true },
      };
    }
    const mode = travelModeFromUtterance(
      input.utterance?.trim() || input.query?.trim() || "",
    );
    const mapsUrl = buildMapsNavigateUrl({ lat, lng, label, mode });
    return {
      ok: true,
      toolId,
      summaryKo: `${label}까지 길을 열었어요`,
      mapsUrl,
      pickedLabelKo: label,
      meta: { handoff: "maps_directions", travelMode: mode },
    };
  }

  if (toolId === "calendar.add") {
    const contextEventId = input.contextEventId?.trim() ?? "";
    const label = input.placeName?.trim() || input.query?.trim() || "";
    if (!contextEventId || !label) {
      return {
        ok: true,
        toolId,
        summaryKo: "일정에 넣을 장소가 없어요",
        waitingCommit: false,
        reservedOpIds: [],
        meta: { handoff: "calendar_prep", missingContext: true },
      };
    }
    const op = enqueueCalendarPrepOperation({
      contextEventId,
      contextLabelKo: input.contextLabelKo,
      placeLabelKo: label,
      placeId: input.placeId,
    });
    return {
      ok: true,
      toolId,
      summaryKo: `${label} 일정을 결재함에 담았어요 · 아직 캘린더에 쓰지 않았어요`,
      waitingCommit: true,
      reservedOpIds: [op.operationId],
      pickedLabelKo: label,
      meta: { handoff: "calendar_prep", prepareOnly: true },
    };
  }

  if (toolId === "hotel.lookup") {
    const candidates = placeSearchCandidates("lodging", input);
    return {
      ok: true,
      toolId,
      summaryKo: formatLookupCountSummaryKo("숙소", candidates.length),
      candidates,
    };
  }

  if (toolId === "restaurant.lookup") {
    const candidates = placeSearchCandidates("eatery", input);
    return {
      ok: true,
      toolId,
      summaryKo: formatLookupCountSummaryKo("맛집", candidates.length),
      candidates,
    };
  }

  if (toolId === "pharmacy.lookup") {
    const query = composeAmenityLookupQuery(
      input.query?.trim() || input.labels?.[0] || input.utterance || "약국",
    );
    const candidates = placeSearchCandidates("poi", { ...input, query });
    return {
      ok: true,
      toolId,
      summaryKo: formatLookupCountSummaryKo("약국·편의", candidates.length),
      candidates,
    };
  }

  if (toolId === "ranking.pick") {
    return rankingPickResult(toolId, input);
  }

  if (toolId === "browse.extract") {
    const query =
      input.query?.trim() ||
      input.utterance?.trim() ||
      input.labels?.[0] ||
      "";
    const extracted = runBrowseExtract({ query });
    const candidates = hitsToCandidates(
      rankByValueConsensus(browseOffersToPlaceHits(extracted.offers)),
    );
    return {
      ok: true,
      toolId,
      summaryKo: extracted.summaryKo,
      candidates,
      meta: {
        prepareOnly: true,
        browseVia: extracted.via,
        browseHost: extracted.host,
      },
    };
  }

  if (toolId !== "booking.prepare") {
    return {
      ok: true,
      toolId,
      summaryKo: "도구를 찾지 못했어요",
    };
  }

  const stay = mergeLodgingStayForToolInvoke({
    contextEventId: input.contextEventId,
    checkInIso: input.checkInIso,
    checkOutIso: input.checkOutIso,
    guestCount: input.guestCount,
  });
  return {
    ok: true,
    toolId,
    summaryKo: input.placeName
      ? `${input.placeName} 예약 준비를 연결해요`
      : "예약 준비를 연결해요",
    meta: {
      prepareOnly: true,
      placeId: input.placeId ?? null,
      placeName: input.placeName ?? null,
      guestCount: stay.guestCount,
      checkInIso: stay.checkInIso,
      checkOutIso: stay.checkOutIso,
      ...bookingControlToToolMeta(
        resolveFieldControl(input)?.booking ?? {
          maxPriceKrw: null,
          companion: null,
          preferReservable: false,
          weather: null,
          crowd: null,
          timeScope: null,
        },
      ),
    },
  };
}

/**
 * Live tool invoke — LiteAPI lodging + Google/Naver eatery when keys exist.
 */
export async function invokeRimvioToolAsync(
  toolId: RimvioToolId,
  input: ToolInvokeInput = {},
): Promise<ToolInvokeResult> {
  const def = getRimvioTool(toolId);
  if (!def) {
    return {
      ok: true,
      toolId,
      summaryKo: "도구를 찾지 못했어요",
    };
  }

  if (toolId === "maps.search") {
    const domain = input.domain ?? "poi";
    const budgeted = await withToolBudget({
      run: () => placeSearchCandidatesAsync(domain, input),
      isEmpty: (rows) => rows.length === 0,
    });
    const candidates = budgeted.value ?? [];
    return {
      ok: true,
      toolId,
      summaryKo: formatLookupCountSummaryKo("지도", candidates.length),
      candidates,
      ...(budgeted.timedOut || budgeted.retried
        ? {
            meta: {
              timedOut: budgeted.timedOut,
              softRetry: budgeted.retried,
            },
          }
        : {}),
    };
  }

  if (toolId === "hotel.lookup") {
    const budgeted = await withToolBudget({
      run: () => placeSearchCandidatesAsync("lodging", input),
      isEmpty: (rows) => rows.length === 0,
    });
    const candidates = budgeted.value ?? [];
    return {
      ok: true,
      toolId,
      summaryKo: formatLookupCountSummaryKo("숙소", candidates.length),
      candidates,
      ...(budgeted.timedOut || budgeted.retried
        ? {
            meta: {
              timedOut: budgeted.timedOut,
              softRetry: budgeted.retried,
            },
          }
        : {}),
    };
  }

  if (toolId === "restaurant.lookup") {
    const budgeted = await withToolBudget({
      run: () => placeSearchCandidatesAsync("eatery", input),
      isEmpty: (rows) => rows.length === 0,
    });
    const candidates = budgeted.value ?? [];
    return {
      ok: true,
      toolId,
      summaryKo: formatLookupCountSummaryKo("맛집", candidates.length),
      candidates,
      ...(budgeted.timedOut || budgeted.retried
        ? {
            meta: {
              timedOut: budgeted.timedOut,
              softRetry: budgeted.retried,
            },
          }
        : {}),
    };
  }

  if (toolId === "pharmacy.lookup") {
    const query = composeAmenityLookupQuery(
      input.query?.trim() || input.labels?.[0] || input.utterance || "약국",
    );
    const budgeted = await withToolBudget({
      run: () =>
        placeSearchCandidatesAsync("poi", {
          ...input,
          query,
        }),
      isEmpty: (rows) => rows.length === 0,
    });
    const candidates = budgeted.value ?? [];
    return {
      ok: true,
      toolId,
      summaryKo: formatLookupCountSummaryKo("약국·편의", candidates.length),
      candidates,
      ...(budgeted.timedOut || budgeted.retried
        ? {
            meta: {
              timedOut: budgeted.timedOut,
              softRetry: budgeted.retried,
            },
          }
        : {}),
    };
  }

  if (toolId === "ranking.pick") {
    return rankingPickResult(toolId, input);
  }

  return invokeRimvioTool(toolId, input);
}
