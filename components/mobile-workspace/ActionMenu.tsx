"use client";

/**
 * Long-press Action Menu — mobile Object actions.
 */

import { cn } from "@/lib/utils";

export type ActionMenuItem = {
  readonly id: string;
  readonly labelKo: string;
  readonly onSelect: () => void;
};

export type ActionMenuProps = {
  readonly titleKo: string;
  readonly items: readonly ActionMenuItem[];
  readonly onDismiss: () => void;
  readonly className?: string;
};

export function ActionMenu({
  titleKo,
  items,
  onDismiss,
  className,
}: ActionMenuProps) {
  return (
    <div
      className={cn(
        "pointer-events-auto fixed inset-0 z-[80] flex items-end justify-center bg-black/40 px-3 pb-[max(1rem,env(safe-area-inset-bottom))]",
        className,
      )}
      data-mobile-action-menu
      onClick={onDismiss}
    >
      <div
        className="w-full max-w-[420px] overflow-hidden rounded-[22px] bg-[#1c1c1e]/95 shadow-2xl ring-1 ring-white/10 backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="border-b border-white/10 px-4 py-3 text-center text-[13px] font-semibold text-white/55">
          {titleKo}
        </p>
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="w-full px-4 py-3.5 text-center text-[16px] font-semibold text-[#0a84ff] active:bg-white/5"
                onClick={() => {
                  item.onSelect();
                  onDismiss();
                }}
              >
                {item.labelKo}
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="w-full border-t border-white/10 px-4 py-3.5 text-center text-[16px] font-bold text-white"
          onClick={onDismiss}
        >
          취소
        </button>
      </div>
    </div>
  );
}
