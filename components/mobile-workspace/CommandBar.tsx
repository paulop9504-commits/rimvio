"use client";

/**
 * Floating NL Command Bar — ChatGPT input + Cursor command palette feel.
 */

import { useCallback, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type CommandBarProps = {
  readonly placeholder?: string;
  readonly busy?: boolean;
  readonly onSubmit: (text: string) => void;
  readonly className?: string;
};

export function CommandBar({
  placeholder = "무엇이든 물어보세요",
  busy = false,
  onSubmit,
  className,
}: CommandBarProps) {
  const [text, setText] = useState("");

  const send = useCallback(() => {
    const t = text.trim();
    if (!t || busy) return;
    onSubmit(t);
    setText("");
  }, [text, busy, onSubmit]);

  return (
    <div
      className={cn(
        "pointer-events-auto w-full max-w-[min(100%,420px)]",
        className,
      )}
      data-mobile-command-bar
    >
      <div className="flex items-end gap-2 rounded-[22px] bg-black/60 px-3 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.35)] ring-1 ring-white/12 backdrop-blur-2xl">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={1}
          placeholder={placeholder}
          disabled={busy}
          className="max-h-24 min-h-[40px] flex-1 resize-none bg-transparent py-2 text-[15px] font-medium leading-snug text-white placeholder:text-white/40 focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          aria-label="Workspace command"
        />
        <button
          type="button"
          className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-black disabled:opacity-40"
          disabled={busy || !text.trim()}
          onClick={send}
          aria-label="Send"
        >
          <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
