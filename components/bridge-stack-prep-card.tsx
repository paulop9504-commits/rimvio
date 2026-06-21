"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { BridgeStackPrepItem } from "@/lib/experience-bridge/project-bridge-stack-prep";
import {
  RIMVIO_TYPE,
  rimvioCompactPrimaryCtaClass,
  rimvioGhostCtaClass,
  rimvioSurfaceCardClass,
} from "@/lib/design/rimvio-ontology";
import { cn } from "@/lib/utils";

type BridgeStackPrepCardProps = {
  item: BridgeStackPrepItem;
  onDismiss?: () => void;
  className?: string;
};

export function BridgeStackPrepCard({
  item,
  onDismiss,
  className,
}: BridgeStackPrepCardProps) {
  return (
    <article
      className={cn(rimvioSurfaceCardClass("p-3 backdrop-blur-md"), className)}
      data-bridge-stack-prep={item.kind}
    >
      <p className={cn("line-clamp-1 font-semibold", RIMVIO_TYPE.body)}>{item.title}</p>
      <p className={cn("mt-0.5 line-clamp-2", RIMVIO_TYPE.caption)}>{item.line}</p>
      <div className="mt-2.5 flex items-center gap-2">
        <Link
          href={item.href}
          className={cn(rimvioCompactPrimaryCtaClass(), "h-9 flex-none rounded-full px-3")}
        >
          {item.ctaLabel}
          <ChevronRight className="ml-0.5 size-3.5" aria-hidden />
        </Link>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className={cn(rimvioGhostCtaClass(), "h-9 shrink-0 rounded-full px-3 text-[12px]")}
          >
            나중에
          </button>
        ) : null}
      </div>
    </article>
  );
}
