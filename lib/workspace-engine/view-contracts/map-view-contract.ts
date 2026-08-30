/**
 * Map View Contract — canonical View-layer contract for geo objects.
 * Extensions implement this; Workspace Engine projects Object → Map markers.
 */

import type { WorkspaceMapPin } from "@/lib/context-workspace/map/workspace-map-provider";
import type {
  ViewContractSpec,
  ViewExtensionDraft,
  ViewExtensionValidationResult,
} from "@/lib/workspace-engine/view-contracts/types";

export const MAP_VIEW_CONTRACT_VERSION = "1.0.0";

/** Minimal geo object — View input (not Capability I/O). */
export type GeoObject = {
  readonly id: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly title: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
};

export const MAP_VIEW_CONTRACT: ViewContractSpec = {
  kind: "map",
  version: MAP_VIEW_CONTRACT_VERSION,
  titleKo: "Map View",
  summaryKo:
    "GeoObject[]를 지도 surface에 투영. Map은 Capability가 아니라 View Contract Extension.",
  consumesObjectType: "GeoObject[]",
  objectRequirements: [
    { name: "id", type: "string", required: true, descriptionKo: "고유 식별자" },
    { name: "latitude", type: "number", required: true, descriptionKo: "WGS84 위도" },
    { name: "longitude", type: "number", required: true, descriptionKo: "WGS84 경도" },
    { name: "title", type: "string", required: true, descriptionKo: "마커 라벨" },
    { name: "metadata", type: "object", required: false, descriptionKo: "kind · rating · price 등" },
  ],
  events: [
    { id: "select", descriptionKo: "마커 선택" },
    { id: "hover", descriptionKo: "마커 hover" },
    { id: "open", descriptionKo: "Object detail 열기" },
    { id: "filter", descriptionKo: "subset 필터" },
    { id: "move", descriptionKo: "카메라 이동" },
  ],
  actions: [
    { id: "focusObject", descriptionKo: "특정 Object로 카메라 focus" },
    { id: "selectObject", descriptionKo: "Object 선택 상태 반영" },
    { id: "openObject", descriptionKo: "Workspace Primary Focus로 Object 열기" },
  ],
  permissions: ["read:location"],
};

/** Project Workspace SSOT pin → View Contract GeoObject. */
export function workspaceMapPinToGeoObject(pin: WorkspaceMapPin): GeoObject {
  return {
    id: pin.id,
    latitude: pin.lat,
    longitude: pin.lng,
    title: pin.title,
    metadata: {
      kind: pin.kind,
      rating: pin.rating,
      amountLabel: pin.amountLabel,
      selected: pin.selected,
      bookmarked: pin.bookmarked,
      stopOrder: pin.stopOrder,
    },
  };
}

export function geoObjectsToMapPins(objects: readonly GeoObject[]): WorkspaceMapPin[] {
  return objects.map((obj) => ({
    id: obj.id,
    title: obj.title,
    lat: obj.latitude,
    lng: obj.longitude,
    kind: (obj.metadata?.kind as WorkspaceMapPin["kind"]) ?? undefined,
    rating: (obj.metadata?.rating as number | null) ?? null,
    amountLabel: (obj.metadata?.amountLabel as string | null) ?? null,
    selected: Boolean(obj.metadata?.selected),
    bookmarked: Boolean(obj.metadata?.bookmarked),
    stopOrder: (obj.metadata?.stopOrder as number | null) ?? null,
  }));
}

export function validateMapViewExtension(
  draft: ViewExtensionDraft,
): ViewExtensionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (draft.contractKind !== "map") {
    errors.push("Map Extension은 contractKind=map 이어야 합니다.");
  }
  if (draft.contractVersion !== MAP_VIEW_CONTRACT_VERSION) {
    warnings.push(
      `Contract version ${draft.contractVersion} — canonical ${MAP_VIEW_CONTRACT_VERSION}`,
    );
  }
  if (!draft.consumes.includes("GeoObject")) {
    errors.push("consumes에 GeoObject가 필요합니다.");
  }

  const requiredEvents = MAP_VIEW_CONTRACT.events.map((e) => e.id);
  for (const ev of requiredEvents) {
    if (!draft.supportsEvents.includes(ev)) {
      warnings.push(`권장 event 미선언: ${ev}`);
    }
  }

  if ((draft.testObjectCount ?? 0) < 10) {
    warnings.push("Sandbox test 권장: 최소 10개 GeoObject");
  }

  return {
    valid: errors.length === 0,
    errorsKo: errors,
    warningsKo: warnings,
  };
}
