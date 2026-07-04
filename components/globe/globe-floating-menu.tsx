"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type GlobeFloatingMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
  panelClassName?: string;
  align?: "left" | "right";
};

/**
 * Small anchored overflow used by Globe chrome.
 * Keeps outside-click/escape handling in one place.
 */
export function GlobeFloatingMenu({
  open,
  onOpenChange,
  trigger,
  children,
  className,
  panelClassName,
  align = "left",
}: GlobeFloatingMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || !rootRef.current?.contains(target)) {
        onOpenChange(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onOpenChange, open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {trigger}
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className={cn(
              "absolute top-[calc(100%+0.45rem)] z-30 overflow-hidden rounded-[1rem] border border-border/70 bg-card/98 shadow-lg ring-1 ring-border/50 backdrop-blur-xl",
              align === "right" ? "right-0" : "left-0",
              panelClassName,
            )}
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
