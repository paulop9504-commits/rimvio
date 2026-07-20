"use client";

import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { setGlobeComposeInputFocused } from "@/lib/globe/compose-input-focus";
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

type AnchorBox = { left: number; top: number; width: number; height: number };

/**
 * IME-safe composer:
 * - Uncontrolled DOM value (no keystroke → React)
 * - Portaled out of the PromptFrame/PinBar render tree so parent storms
 *   cannot stall Korean composition
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
    const slotRef = useRef<HTMLDivElement>(null);
    const busyRef = useRef(busy);
    busyRef.current = busy;
    const onSubmitRef = useRef(onSubmit);
    onSubmitRef.current = onSubmit;
    const [hasText, setHasText] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [box, setBox] = useState<AnchorBox | null>(null);

    useEffect(() => {
      setMounted(true);
    }, []);

    const syncBox = useCallback(() => {
      const slot = slotRef.current;
      if (!slot) {
        return;
      }
      const rect = slot.getBoundingClientRect();
      setBox({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: Math.max(rect.height, 40),
      });
    }, []);

    useLayoutEffect(() => {
      syncBox();
    }, [syncBox]);

    useEffect(() => {
      const onResize = () => syncBox();
      window.addEventListener("resize", onResize);
      window.visualViewport?.addEventListener("resize", onResize);
      window.visualViewport?.addEventListener("scroll", onResize);
      return () => {
        window.removeEventListener("resize", onResize);
        window.visualViewport?.removeEventListener("resize", onResize);
        window.visualViewport?.removeEventListener("scroll", onResize);
      };
    }, [syncBox]);

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

    const onKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter") {
        return;
      }
      if (event.nativeEvent.isComposing || event.keyCode === 229) {
        return;
      }
      event.preventDefault();
      if (busyRef.current || !(inputRef.current?.value.trim())) {
        return;
      }
      onSubmitRef.current();
    }, []);

    const composer = (
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl bg-[#f5f5f7] px-3 py-2 ring-1 ring-black/[0.04]",
          className,
        )}
        data-globe-context-condition-compose-input
        style={
          box
            ? {
                position: "fixed",
                left: box.left,
                top: box.top,
                width: box.width,
                height: box.height,
                zIndex: 80,
                boxSizing: "border-box",
              }
            : undefined
        }
      >
        <input
          ref={inputRef}
          type="text"
          defaultValue=""
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="search"
          onFocus={() => {
            setGlobeComposeInputFocused(true);
            syncBox();
          }}
          onBlur={() => {
            setGlobeComposeInputFocused(false);
          }}
          onInput={(event) => {
            // Prefer onInput over onChange for IME — still no parent lift.
            const next = event.currentTarget.value.trim().length > 0;
            setHasText((prev) => (prev === next ? prev : next));
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-[13px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none"
          aria-label={placeholder}
        />
        <button
          type="button"
          onMouseDown={(event) => {
            // Keep focus on input so blur does not race submit.
            event.preventDefault();
          }}
          onClick={() => {
            if (busyRef.current || !(inputRef.current?.value.trim())) {
              return;
            }
            onSubmitRef.current();
          }}
          disabled={busy || !hasText}
          className="shrink-0 rounded-lg bg-[#1d1d1f] px-2.5 py-1 text-[11px] font-semibold text-white active:scale-[0.98] disabled:opacity-40"
        >
          {busy ? "…" : submitLabel}
        </button>
      </div>
    );

    return (
      <>
        <div
          ref={slotRef}
          className="h-10 w-full"
          aria-hidden
          data-globe-context-condition-compose-slot
        />
        {mounted && box ? createPortal(composer, document.body) : null}
      </>
    );
  }),
);
