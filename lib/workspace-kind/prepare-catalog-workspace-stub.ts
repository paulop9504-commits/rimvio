/**
 * Catalog Workspace stub — Finance / Document / Coding skeleton prepare.
 * Morphology-stamped shell + ready_slot nodes (no live tools / no Commit).
 */

import { ensureTripContextEvent } from "@/lib/experience-run/ensure-trip-context-event";
import {
  readContextWorkspace,
  writeContextWorkspace,
  writeContextWorkspaceExpanded,
} from "@/lib/context-workspace/workspace-store";
import { openMapContextWorkspace } from "@/lib/context-workspace/open-map-workspace";
import type { ContextWorkspaceNode } from "@/lib/context-workspace/types";
import type { CatalogWorkspaceRoute } from "@/lib/workspace-kind/classify-workspace-route";
import {
  publishGlobeProjectionLayerPolicy,
  readGlobeProjectionLayerPolicy,
} from "@/lib/globe/spatial-semantic/globe-projection-layer-policy";
import type { WorkspaceMorphologyId } from "@/lib/workspace-morphology/registry";
import { appendWorkspaceSdkComposeTurn } from "@/lib/workspace-sdk/append-workspace-sdk-compose-turn";
import type { WorkspaceSdkFrame } from "@/lib/workspace-sdk/types";

export type CatalogWorkspaceStubResult = {
  readonly route: CatalogWorkspaceRoute;
  readonly contextEventId: string;
  readonly statusKo: string;
  readonly morphologyId: WorkspaceMorphologyId;
};

const ROUTE_META: Record<
  CatalogWorkspaceRoute,
  {
    readonly titleKo: string;
    readonly statusKo: string;
    readonly query: string;
    readonly morphologyId: WorkspaceMorphologyId;
    readonly slots: readonly { readonly id: string; readonly title: string }[];
  }
> = {
  finance: {
    titleKo: "금융 작업장",
    statusKo: "금융 작업장을 열었어요 · 레저 패널 준비됨",
    query: "finance stub",
    morphologyId: "ledger",
    slots: [
      { id: "symbol", title: "종목 · 포커스" },
      { id: "thesis", title: "가설 · 메모" },
      { id: "risk", title: "리스크 · 한도" },
    ],
  },
  document: {
    titleKo: "문서 작업장",
    statusKo: "문서 작업장을 열었어요 · 초안 칸 준비됨",
    query: "document stub",
    morphologyId: "document",
    slots: [
      { id: "outline", title: "목차 · 골격" },
      { id: "draft", title: "본문 초안" },
      { id: "review", title: "검토 · 체크" },
    ],
  },
  coding: {
    titleKo: "코딩 작업장",
    statusKo: "코딩 작업장을 열었어요 · 코드 칸 준비됨",
    query: "coding stub",
    morphologyId: "code_workspace",
    slots: [
      { id: "spec", title: "스펙 · Intent" },
      { id: "files", title: "파일 · 탭" },
      { id: "verify", title: "검증 · 테스트" },
    ],
  },
};

function skeletonNodes(
  route: CatalogWorkspaceRoute,
  utterance: string,
): ContextWorkspaceNode[] {
  const meta = ROUTE_META[route];
  const now = Date.now();
  return meta.slots.map((slot, i) => ({
    id: `catalog:${route}:${slot.id}`,
    kind: "amenity" as const,
    placeId: `catalog:${route}:${slot.id}`,
    title: slot.title,
    summaryKo: utterance.slice(0, 72) || meta.titleKo,
    lat: 0,
    lng: 0,
    rating: null,
    priceBand: null,
    amountLabel: null,
    thumbnailUrl: null,
    tags: ["ready_slot", "skeleton", "catalog", route, meta.morphologyId],
    visible: true,
    selected: i === 0,
    bookmarked: false,
    source: "trip_prep" as const,
    actionReadyState: undefined,
  }));
}

function stubSdkFrame(input: {
  readonly contextEventId: string;
  readonly route: CatalogWorkspaceRoute;
}): WorkspaceSdkFrame {
  const meta = ROUTE_META[input.route];
  const focus = meta.slots[0]!;
  return {
    version: 1,
    kind: "travel",
    morphologyId: meta.morphologyId,
    lifecycle: "prepared",
    contextEventId: input.contextEventId,
    header: {
      titleKo: meta.titleKo,
      subtitleKo: null,
      eyebrowKo: "자원 준비됨",
    },
    ai: {
      roleLabelKo: "작업 파트너",
      promptPlaceholderKo: "이어서 맞춰 볼까요?",
      stripHintKo: meta.statusKo,
    },
    primaryFocus: {
      slotId: focus.id,
      labelKo: focus.title,
      headlineKo: `현재 작업 · ${focus.title}`,
      askKo: `${focus.title} 맞추는 중`,
    },
    node: { surface: "list", labelKo: "오브젝트" },
    action: {
      id: "prepare",
      labelKo: "준비 계속",
      toolId: null,
    },
    commit: {
      labelKo: "승인 · 반영",
      requiresHuman: true,
      leadsToPayment: false,
    },
    progressiveHintKo: "지금은 골격 · 다음에 데이터 · 실행",
    activePrimitiveIds: [],
  };
}

/**
 * Soft-open a catalog Workspace shell so Intent → Workspace feels Instant.
 * Recipe/tools come later — do not Commit Reality.
 */
export function prepareCatalogWorkspaceStub(input: {
  readonly utterance: string;
  readonly route: CatalogWorkspaceRoute;
  readonly explicitContextEventId?: string | null;
}): CatalogWorkspaceStubResult {
  const meta = ROUTE_META[input.route];
  const utterance = input.utterance.trim();
  const existing = input.explicitContextEventId?.trim();
  const event = existing
    ? { id: existing, title: meta.titleKo }
    : ensureTripContextEvent({
        message: `${meta.titleKo} · ${utterance}`,
        profile: "leisure_travel",
      });

  openMapContextWorkspace({
    contextEventId: event.id,
    domain: "amenity",
    query: meta.query,
    summaryKo: `${meta.titleKo} · 준비됨`,
    hits: [],
    candidates: [],
    source: "trip_prep",
  });

  const opened = readContextWorkspace(event.id);
  if (opened) {
    const nodes = skeletonNodes(input.route, utterance);
    writeContextWorkspace({
      ...opened,
      nodes,
      selectedIds: nodes[0] ? [nodes[0].id] : [],
      summaryKo: `${meta.titleKo} · ${meta.morphologyId}`,
      lastChangeKo: meta.statusKo,
      updatedAtIso: new Date().toISOString(),
    });
  }

  writeContextWorkspaceExpanded(event.id, false);
  appendWorkspaceSdkComposeTurn({
    contextEventId: event.id,
    frame: stubSdkFrame({
      contextEventId: event.id,
      route: input.route,
    }),
    openHost: false,
  });
  const prev = readGlobeProjectionLayerPolicy();
  publishGlobeProjectionLayerPolicy({
    ...prev,
    mode: "focus",
    activeContextEventId: event.id,
  });

  return {
    route: input.route,
    contextEventId: event.id,
    statusKo: meta.statusKo,
    morphologyId: meta.morphologyId,
  };
}
