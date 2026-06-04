"use client";

import { memo } from "react";
import { PrimaryActionButton } from "@/components/surface-composition/primary-action-button";
import { SurfaceMfShell } from "@/components/surface-composition/micro-frontends/surface-mf-shell";
import type { SurfaceNode, DispatchSurfaceAction } from "@/lib/surface-composition/surface-node-contract";

export type PrimarySurfaceMfProps = {
  node: SurfaceNode;
  onDispatch: DispatchSurfaceAction;
};

export const PrimarySurfaceMf = memo(function PrimarySurfaceMf({
  node,
  onDispatch,
}: PrimarySurfaceMfProps) {
  return (
    <SurfaceMfShell node={node}>
      <header className="space-y-1">
        <h3 className="text-[15px] font-semibold text-rimvio-ink">{node.title}</h3>
        {node.description ? (
          <p className="text-[13px] leading-snug text-rimvio-ink/65">{node.description}</p>
        ) : null}
      </header>
      {node.narration?.summary ? (
        <p className="mt-2 text-[12px] text-rimvio-ink/50">{node.narration.summary}</p>
      ) : null}
      <div className="mt-3">
        <PrimaryActionButton
          action={node.primaryAction}
          onPress={() => onDispatch(node, node.primaryAction)}
        />
      </div>
      {node.secondaryActions.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {node.secondaryActions.map((action) => (
            <button
              key={action.id}
              type="button"
              data-surface-cta="secondary"
              className="rounded-full border border-black/[0.08] px-3 py-1.5 text-[12px] text-rimvio-ink/80"
              onClick={() => onDispatch(node, action)}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </SurfaceMfShell>
  );
});
