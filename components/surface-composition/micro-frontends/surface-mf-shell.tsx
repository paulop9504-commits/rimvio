"use client";

import { memo, type ReactNode } from "react";
import type { SurfaceNode } from "@/lib/surface-composition/surface-node-contract";
import { cn } from "@/lib/utils";

export type SurfaceMfShellProps = {
  node: SurfaceNode;
  children: ReactNode;
  className?: string;
};

/** Shared chrome — MFEs own inner layout only. */
export const SurfaceMfShell = memo(function SurfaceMfShell({
  node,
  children,
  className,
}: SurfaceMfShellProps) {
  return (
    <article
      className={cn(
        "rounded-2xl border border-black/[0.06] bg-white/95 p-4 shadow-sm",
        className,
      )}
      data-surface-id={node.id}
      data-surface-type={node.type}
      data-surface-mfe={node.mfeId}
      data-layout-slot={node.layoutSlot}
    >
      {children}
    </article>
  );
});
