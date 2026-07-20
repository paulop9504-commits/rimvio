"use client";

import {
  forwardRef,
  memo,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { cn } from "@/lib/utils";

export type GlobeContextConditionComposeInputHandle = {
  clear: () => void;
  getValue: () => string;
};

type GlobeContextConditionComposeInputProps = {
  busy: boolean;
  placeholder: string;
  submitLabel: string;
  onSubmit: () => void;
  className?: string;
};

/**
 * Leaf composer — owns DOM value so parent re-renders (globe/home/thread)
 * cannot stall Korean IME. Submit button armed without lifting every keystroke.
 */
export const GlobeContextConditionComposeInput = memo(
  forwardRef<
    GlobeContextConditionComposeInputHandle,
    GlobeContextConditionComposeInputProps
  >(function GlobeContextConditionComposeInput(
    { busy, placeholder, submitLabel, onSubmit, className },
    ref,
  ) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [hasText, setHasText] = useState(false);

    useImperativeHandle(
      ref,
      () => ({
        clear: () => {
          if (inputRef.current) {
            inputRef.current.value = "";
          }
          setHasText(false);
        },
        getValue: () => inputRef.current?.value ?? "",
      }),
      [],
    );

    const onChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
      const next = event.target.value.trim().length > 0;
      setHasText((prev) => (prev === next ? prev : next));
    }, []);

    const onKeyDown = useCallback(
      (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== "Enter") {
          return;
        }
        if (event.nativeEvent.isComposing || event.keyCode === 229) {
          return;
        }
        event.preventDefault();
        if (busy || !(inputRef.current?.value.trim())) {
          return;
        }
        onSubmit();
      },
      [busy, onSubmit],
    );

    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl bg-[#f5f5f7] px-3 py-2 ring-1 ring-black/[0.04]",
          className,
        )}
        data-globe-context-condition-compose-input
      >
        <input
          ref={inputRef}
          type="text"
          defaultValue=""
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-[13px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none"
          aria-label={placeholder}
        />
        <button
          type="button"
          onClick={() => {
            if (busy || !(inputRef.current?.value.trim())) {
              return;
            }
            onSubmit();
          }}
          disabled={busy || !hasText}
          className="shrink-0 rounded-lg bg-[#1d1d1f] px-2.5 py-1 text-[11px] font-semibold text-white active:scale-[0.98] disabled:opacity-40"
        >
          {busy ? "…" : submitLabel}
        </button>
      </div>
    );
  }),
);
