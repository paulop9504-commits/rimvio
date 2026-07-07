"use client";

import type {
  GeoOntologyFacetId,
  GeoOntologyGraph,
} from "@/lib/globe/spatial-semantic/types";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeContextAgentOntologyGraphProps = {
  graph: GeoOntologyGraph | null;
  activeFacetId?: GeoOntologyFacetId | null;
  highlightedPlaceId?: string | null;
  onSelectFacet?: (facetId: GeoOntologyFacetId) => void;
  onSelectPlace?: (placeId: string) => void;
  compact?: boolean;
  /** Facet chips removed — operator auto-selects; dev may show places only. */
  showFacetChips?: boolean;
  className?: string;
};

/** Geo-Ontology Bridge — semantic nodes beside assistant (Globe sync via facet store). */
export function GlobeContextAgentOntologyGraph({
  graph,
  activeFacetId = null,
  highlightedPlaceId = null,
  onSelectFacet,
  onSelectPlace,
  compact = false,
  showFacetChips = false,
  className,
}: GlobeContextAgentOntologyGraphProps) {
  if (!graph || graph.nodes.length === 0) {
    return null;
  }

  const contextNode = graph.nodes.find((node) => node.kind === "context");
  const rootNode = graph.nodes.find((node) => node.kind === "root");
  const facetNodes = graph.nodes.filter((node) => node.kind === "facet");
  const placeNodes = graph.nodes.filter((node) => node.kind === "place");

  return (
    <div
      className={cn(
        "rounded-xl bg-[#f5f5f7]/90 px-2.5 py-2 ring-1 ring-black/[0.04]",
        className,
      )}
      data-geo-ontology-graph
      data-geo-ontology-batch={graph.batchId ?? undefined}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">
        {copy.globe.geoOntologyGraphEyebrow}
      </p>
      {contextNode ? (
        <p className="mt-1 text-[11px] font-medium text-[#515154]">{contextNode.labelKo}</p>
      ) : null}
      {rootNode ? (
        <div className="mt-1.5 flex items-center gap-1.5">
          <span
            className="inline-flex rounded-full bg-[#1d1d1f] px-2 py-0.5 text-[11px] font-semibold text-white"
            data-geo-ontology-node="root"
          >
            {rootNode.labelKo}
          </span>
        </div>
      ) : null}
      {showFacetChips && facetNodes.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {facetNodes.map((node) => {
            const facetId = node.facetId;
            if (!facetId) {
              return null;
            }
            const active = activeFacetId === facetId;
            return (
              <button
                key={node.id}
                type="button"
                onClick={() => onSelectFacet?.(facetId)}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 transition active:scale-[0.98]",
                  active
                    ? "bg-[#0071e3]/12 text-[#0071e3] ring-[#0071e3]/25"
                    : "bg-white text-[#515154] ring-black/[0.06] hover:bg-[#0071e3]/8",
                )}
                data-geo-ontology-node="facet"
                data-geo-ontology-facet={facetId}
              >
                {node.labelKo}
              </button>
            );
          })}
        </div>
      ) : null}
      {!compact && placeNodes.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1 border-t border-black/[0.05] pt-2">
          {placeNodes.map((node) => {
            if (!node.placeId) {
              return null;
            }
            const active = highlightedPlaceId === node.placeId;
            return (
              <button
                key={node.id}
                type="button"
                onClick={() => onSelectPlace?.(node.placeId!)}
                className={cn(
                  "max-w-full truncate rounded-lg px-2 py-1 text-[10px] font-medium ring-1 transition active:scale-[0.98]",
                  active
                    ? "bg-[#0071e3]/10 text-[#0071e3] ring-[#0071e3]/20"
                    : "bg-white/80 text-[#1d1d1f] ring-black/[0.05]",
                )}
                data-geo-ontology-node="place"
                data-geo-ontology-place={node.placeId}
              >
                {node.kindTag === "eatery" ? "🍜" : "🏨"} {node.labelKo}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
