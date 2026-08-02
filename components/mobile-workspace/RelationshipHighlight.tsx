"use client";

/**
 * Relationship Highlight — related entities only when an object is selected.
 * Does not draw dense edge soup by default.
 */

import { cn } from "@/lib/utils";
import type {
  MobileWorkspaceEntity,
  MobileWorkspaceRelation,
} from "@/lib/mobile-workspace";

export type RelationshipHighlightProps = {
  readonly activeEntityId: string | null;
  readonly entities: readonly MobileWorkspaceEntity[];
  readonly relations: readonly MobileWorkspaceRelation[];
  readonly className?: string;
};

export function relatedEntityIds(input: {
  readonly activeEntityId: string | null;
  readonly relations: readonly MobileWorkspaceRelation[];
}): ReadonlySet<string> {
  const set = new Set<string>();
  const id = input.activeEntityId;
  if (!id) return set;
  for (const r of input.relations) {
    if (r.fromId === id) set.add(r.toId);
    if (r.toId === id) set.add(r.fromId);
  }
  return set;
}

export function RelationshipHighlight({
  activeEntityId,
  entities,
  relations,
  className,
}: RelationshipHighlightProps) {
  if (!activeEntityId) return null;
  const related = relatedEntityIds({ activeEntityId, relations });
  const lines = relations.filter(
    (r) => r.fromId === activeEntityId || r.toId === activeEntityId,
  );
  if (lines.length === 0) return null;

  const active = entities.find((e) => e.id === activeEntityId);
  const chips = lines.slice(0, 4).map((r) => {
    const otherId = r.fromId === activeEntityId ? r.toId : r.fromId;
    const other = entities.find((e) => e.id === otherId);
    return {
      id: r.id,
      title: other?.title ?? otherId,
      detail:
        r.walkMinutes != null
          ? `도보 ${r.walkMinutes}분`
          : r.meters != null
            ? `${r.meters}m`
            : r.labelKo,
    };
  });

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 top-[max(4.5rem,env(safe-area-inset-top))] z-[4] flex justify-center px-3",
        className,
      )}
      data-mobile-relationship-highlight
      data-related-count={related.size}
    >
      <div className="pointer-events-auto max-w-[min(94vw,380px)] rounded-2xl bg-black/55 px-3 py-2 shadow-lg ring-1 ring-white/12 backdrop-blur-xl">
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-white/45">
          {active?.title ?? "Relation"} · Nearby
        </p>
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span
              key={c.id}
              className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white"
            >
              {c.title}
              <span className="text-white/50"> · {c.detail}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
