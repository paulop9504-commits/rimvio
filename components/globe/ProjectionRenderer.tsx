"use client";

/**
 * ProjectionRenderer — Globe as Reality Desktop (Read Only Projection).
 *
 * Hierarchy:
 *   Earth → Region → Location → Context → Entity
 *
 * Forbidden on this surface: edit · pay · commit · mutate Reality.
 */

import { useMemo, useState } from "react";
import { Globe2 } from "lucide-react";
import { RealityNode } from "@/components/globe/RealityNode";
import { ContextNode } from "@/components/globe/ContextNode";
import { EntityMarker } from "@/components/globe/EntityMarker";
import type {
  GlobeRealityInterfaceModel,
  RealityProjectionNode,
} from "@/lib/globe/reality-interface";
import { buildKoreaRealityDesktopSeed } from "@/lib/globe/reality-interface";
import { cn } from "@/lib/utils";

export type ProjectionRendererProps = {
  readonly model?: GlobeRealityInterfaceModel | null;
  /** Use Korea Earth → 대한민국 → 서울/대전 seed when model omitted */
  readonly useKoreaSeed?: boolean;
  readonly onSelectNode?: (node: RealityProjectionNode) => void;
  readonly className?: string;
};

export function ProjectionRenderer({
  model,
  useKoreaSeed = true,
  onSelectNode,
  className,
}: ProjectionRendererProps) {
  const projection = useMemo(
    () => model ?? (useKoreaSeed ? buildKoreaRealityDesktopSeed() : null),
    [model, useKoreaSeed],
  );

  const [selectedId, setSelectedId] = useState<string | null>(
    projection?.selectedContextId ?? null,
  );

  if (!projection) return null;

  const handleSelect = (node: RealityProjectionNode) => {
    setSelectedId(node.id);
    onSelectNode?.(node);
  };

  const pathLabels = projection.path.labels;

  return (
    <div
      className={cn(
        "pointer-events-auto flex w-full max-w-[22rem] flex-col gap-3",
        className,
      )}
      data-globe-projection-renderer
      data-reality-desktop
      data-view-only="true"
      data-may-edit="false"
    >
      {/* Earth breadcrumb — Reality file path */}
      <div className="rounded-[1.05rem] bg-white/94 px-3.5 py-2.5 shadow-[0_8px_28px_rgba(2,32,71,0.12)] ring-1 ring-black/[0.05] backdrop-blur-xl">
        <div className="flex items-start gap-2">
          <Globe2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#3182f6]" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[#8b95a1]">
              Reality Desktop
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[13px] font-semibold leading-snug text-[#191f28]">
              {pathLabels.map((label, index) => (
                <span key={`${label}-${index}`} className="inline-flex items-center">
                  <span>{label}</span>
                  {index < pathLabels.length - 1 ? (
                    <span className="mx-1 text-[#c4cad3]" aria-hidden>
                      →
                    </span>
                  ) : null}
                </span>
              ))}
            </p>
            <p className="mt-1 text-[11px] text-[#8b95a1]">
              Read Only Projection · 수정은 Workspace
            </p>
          </div>
        </div>
      </div>

      {/* Region Nodes */}
      {projection.regionNodes.length > 0 ? (
        <section className="flex flex-col gap-2" data-reality-region-layer>
          <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8b95a1]">
            Region
          </p>
          {projection.regionNodes.map((node) => (
            <RealityNode
              key={node.id}
              node={node}
              selected={selectedId === node.id}
              onSelect={handleSelect}
            />
          ))}
        </section>
      ) : null}

      {/* Context Nodes */}
      {projection.contextNodes.length > 0 ? (
        <section className="flex flex-col gap-2" data-reality-context-layer>
          <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8b95a1]">
            Context
          </p>
          {projection.contextNodes.map((node) => (
            <ContextNode
              key={node.id}
              node={node}
              selected={selectedId === node.id}
              onSelect={handleSelect}
            />
          ))}
        </section>
      ) : null}

      {/* Entity Markers */}
      {projection.entityNodes.length > 0 ? (
        <section className="flex flex-col gap-2" data-reality-entity-layer>
          <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8b95a1]">
            Entity
          </p>
          <div className="flex flex-col gap-1.5">
            {projection.entityNodes.map((node) => (
              <EntityMarker
                key={node.id}
                node={node}
                selected={selectedId === node.id}
                onSelect={handleSelect}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
