import { resolveWorldGeoEntity } from "@/lib/reality-graph/resolve-world-geo";
import { getWorldGeoNode } from "@/lib/reality-graph/world-geo-seed";
import type { ResolvedEntity } from "@/lib/entity-resolver/types";
import {
  AIRPORT_SEMANTIC_PATH,
  LANDMARK_SEMANTIC_PATH,
  LOCATION_SEMANTIC_PATH,
  STATION_SEMANTIC_PATH,
} from "@/lib/entity-resolver/semantic-layer";
import type { WorldGeoEntityId } from "@/lib/reality-graph/types";

/**
 * Reality Graph lookup — attach coords to Station / Airport / Landmark.
 * Prefer catalog geoId, then station/airport probe, then full-text resolve.
 */
export function enrichGeoFromRealityGraph(
  text: string,
  entities: readonly ResolvedEntity[],
): ResolvedEntity[] {
  const next = entities.map((row) => {
    if (!row.geoId) {
      return row;
    }
    const node = getWorldGeoNode(row.geoId);
    if (!node) {
      return row;
    }
    return {
      ...row,
      lat: node.centroid.lat,
      lng: node.centroid.lng,
      geoId: node.id,
      confidence: Math.max(row.confidence, 0.95),
      source: row.source === "dictionary" ? row.source : "reality_graph",
    } as ResolvedEntity;
  });

  const probe =
    next.find((row) => row.kind === "Station")?.label ??
    next.find((row) => row.kind === "Airport")?.label ??
    next.find((row) => row.geoId)?.label ??
    /([가-힣A-Za-z0-9]{2,16}역|tokyo\s*station|東京駅|공항|airport)/iu.exec(
      text,
    )?.[0] ??
    null;

  const hit =
    (probe ? resolveWorldGeoEntity(probe) : null) ??
    resolveWorldGeoEntity(text);
  if (!hit) {
    return next;
  }

  const node = hit.node;
  const aliasBlob = [
    node.labels.ko,
    node.labels.en,
    ...(node.labels.aliases ?? []),
  ].join(" ");
  const isStationPoi =
    node.kind === "poi" && /station|역|駅/iu.test(aliasBlob);
  const isAirportPoi =
    node.kind === "poi" && /airport|공항|空港/iu.test(aliasBlob);
  const isLandmarkPoi =
    node.kind === "poi" &&
    !isStationPoi &&
    !isAirportPoi &&
    /disney|universal|senso|ueno|skytree|shibuya|디즈니|유니버설|센소|우에노|스카이|시부야/iu.test(
      aliasBlob,
    );

  const existingIdx = next.findIndex(
    (row) =>
      (row.kind === "Station" ||
        row.kind === "Airport" ||
        row.kind === "Location" ||
        row.kind === "Museum") &&
      (row.geoId === node.id ||
        row.label === node.labels.ko ||
        (row.queryFocus != null &&
          (row.queryFocus === node.labels.ko ||
            row.label === hit.matchAlias))),
  );

  const kind = isStationPoi
    ? ("Station" as const)
    : isAirportPoi
      ? ("Airport" as const)
      : isLandmarkPoi
        ? ("Location" as const)
        : node.kind === "poi"
          ? ("Location" as const)
          : ("Location" as const);

  const semanticPath = isStationPoi
    ? [...STATION_SEMANTIC_PATH]
    : isAirportPoi
      ? [...AIRPORT_SEMANTIC_PATH]
      : isLandmarkPoi
        ? [...LANDMARK_SEMANTIC_PATH]
        : [...LOCATION_SEMANTIC_PATH];

  const geoEntity: ResolvedEntity = {
    id: node.id as string,
    kind,
    label: node.labels.ko || node.labels.en,
    aliases: [
      node.labels.en,
      node.labels.local ?? "",
      ...(node.labels.aliases ?? []),
    ].filter(Boolean),
    semanticPath,
    confidence: Math.max(hit.confidence, 0.92),
    source: "reality_graph",
    geoId: node.id as WorldGeoEntityId,
    lat: node.centroid.lat,
    lng: node.centroid.lng,
    queryFocus: node.labels.ko,
    span: existingIdx >= 0 ? next[existingIdx]?.span : undefined,
  };

  if (existingIdx >= 0) {
    const prior = next[existingIdx]!;
    const copy = [...next];
    copy[existingIdx] = {
      ...prior,
      ...geoEntity,
      id: prior.id.startsWith("geo:") ? geoEntity.id : prior.id,
      kind: prior.kind === "Airport" || isAirportPoi ? "Airport" : geoEntity.kind === "Station" || isStationPoi ? (isStationPoi ? "Station" : prior.kind) : prior.kind === "Hotel" ? prior.kind : geoEntity.kind,
      semanticPath:
        prior.semanticPath.length > geoEntity.semanticPath.length
          ? prior.semanticPath
          : geoEntity.semanticPath,
      span: prior.span ?? geoEntity.span,
      nearSearch: prior.nearSearch,
      queryFocus: prior.queryFocus ?? geoEntity.queryFocus,
    };
    return copy;
  }

  if (
    !isStationPoi &&
    !isAirportPoi &&
    !isLandmarkPoi &&
    next.some((row) => row.kind === "Station" || row.kind === "Airport")
  ) {
    return next;
  }

  if (!getWorldGeoNode(node.id)) {
    return next;
  }

  return [...next, geoEntity];
}
