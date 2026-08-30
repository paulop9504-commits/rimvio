"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  filterOperatorModels,
  isOperatorModelAvailable,
  type OperatorModelDefinition,
  type OperatorModelId,
  type OperatorModelProvider,
} from "@/lib/hub/dev/operator-model-registry";
import {
  emitOperatorModelPreferenceChanged,
  readOperatorModelPreference,
  resolveActiveOperatorModel,
  writeActiveOperatorModelSession,
  writeOperatorModelPreference,
  type OperatorModelPreference,
} from "@/lib/hub/dev/operator-model-preference";
import { cn } from "@/lib/utils";

type OperatorModelsApiResponse = {
  readonly configured: Partial<Record<OperatorModelProvider, boolean>>;
  readonly anyConfigured?: boolean;
};

type HubOperatorModelPickerProps = {
  readonly className?: string;
  readonly onPreferenceChange?: (preference: OperatorModelPreference, active: OperatorModelDefinition) => void;
};

/** Cursor-style model picker — opens upward from composer pill. */
export function HubOperatorModelPicker({ className, onPreferenceChange }: HubOperatorModelPickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [preference, setPreference] = useState<OperatorModelPreference>(() => readOperatorModelPreference());
  const [configured, setConfigured] = useState<Partial<Record<OperatorModelProvider, boolean>>>({});

  useEffect(() => {
    void fetch("/api/hub/dev/operator/models", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: OperatorModelsApiResponse | null) => {
        if (json?.configured) setConfigured(json.configured);
      })
      .catch(() => undefined);
  }, []);

  const activeModel = useMemo(
    () => resolveActiveOperatorModel({ preference, configured }),
    [preference, configured],
  );

  const filtered = useMemo(() => filterOperatorModels(search), [search]);
  const hoveredModel = filtered.find((m) => m.id === hoveredId) ?? activeModel;

  const applyPreference = useCallback(
    (next: OperatorModelPreference) => {
      setPreference(next);
      writeOperatorModelPreference(next);
      emitOperatorModelPreferenceChanged();
      const resolved = resolveActiveOperatorModel({ preference: next, configured });
      writeActiveOperatorModelSession(resolved);
      onPreferenceChange?.(next, resolved);
    },
    [configured, onPreferenceChange],
  );

  useEffect(() => {
    if (Object.keys(configured).length === 0) return;
    const resolved = resolveActiveOperatorModel({ preference, configured });
    writeActiveOperatorModelSession(resolved);
  }, [configured, preference]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "inline-flex max-w-[170px] items-center gap-0.5 rounded-full bg-[#f3f4f6] py-1 pl-2.5 pr-1.5 text-[10px] font-semibold text-[#6b7280]",
          "hover:bg-[#eceff3] focus:outline-none focus:ring-2 focus:ring-violet-100",
          open && "bg-[#eceff3] ring-1 ring-violet-100",
        )}
      >
        <span className="truncate">{activeModel.shortLabel}</span>
        <ChevronDown className={cn("size-3 shrink-0 opacity-70 transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label="Select model"
          className="absolute bottom-full left-0 z-[120] mb-2 flex w-[min(92vw,280px)] overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-[0_12px_40px_rgba(15,23,42,0.14)]"
        >
          <div className="min-w-0 flex-1">
            <div className="border-b border-[#f3f4f6] p-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search models"
                className="w-full rounded-lg border border-[#e5e7eb] bg-[#fafafa] px-2.5 py-1.5 text-[11px] text-[#111827] placeholder:text-[#9ca3af] focus:border-violet-300 focus:outline-none"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-between border-b border-[#f3f4f6] px-3 py-2">
              <span className="text-[11px] font-medium text-[#374151]">Auto</span>
              <button
                type="button"
                role="switch"
                aria-checked={preference.auto}
                onClick={() => applyPreference({ ...preference, auto: !preference.auto })}
                className={cn(
                  "relative h-5 w-9 rounded-full transition-colors",
                  preference.auto ? "bg-violet-600" : "bg-[#d1d5db]",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform",
                    preference.auto ? "translate-x-4" : "translate-x-0.5",
                  )}
                />
              </button>
            </div>

            <ul className="max-h-[220px] overflow-y-auto rimvio-scroll-touch py-1">
              {filtered.map((model) => {
                const selected = !preference.auto && preference.modelId === model.id;
                const available = isOperatorModelAvailable(model, configured);
                return (
                  <li key={model.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      disabled={!available}
                      onMouseEnter={() => setHoveredId(model.id)}
                      onClick={() => {
                        applyPreference({ modelId: model.id as OperatorModelId, auto: false });
                        setOpen(false);
                        setSearch("");
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[11px]",
                        hoveredId === model.id && "bg-[#f9fafb]",
                        !available && "cursor-not-allowed opacity-45",
                      )}
                    >
                      <span className="min-w-0 truncate font-medium text-[#111827]">{model.label}</span>
                      {selected ? <Check className="size-3.5 shrink-0 text-violet-600" /> : null}
                    </button>
                  </li>
                );
              })}
              {filtered.length === 0 ? (
                <li className="px-3 py-4 text-center text-[10px] text-[#9ca3af]">No models found</li>
              ) : null}
            </ul>

            <div className="border-t border-[#f3f4f6] px-3 py-2">
              <p className="text-[10px] text-[#9ca3af]">
                {configured.openai || configured.gemini
                  ? preference.auto
                    ? `Auto · ${activeModel.provider === "gemini" ? "Gemini" : "OpenAI"} 우선`
                    : "선택한 모델로 Operator 실행"
                  : "LLM API 키가 없으면 규칙 기반 Operator만 실행돼요"}
              </p>
            </div>
          </div>

          <div className="hidden w-[180px] shrink-0 border-l border-[#f3f4f6] bg-[#fafafa] p-3 sm:block">
            <p className="text-[11px] font-semibold text-[#111827]">{hoveredModel.label}</p>
            <p className="mt-1.5 text-[10px] leading-relaxed text-[#6b7280]">{hoveredModel.description}</p>
            <p className="mt-2 text-[10px] text-[#9ca3af]">{hoveredModel.contextWindow}</p>
            {hoveredModel.version ? (
              <p className="mt-1 text-[10px] italic text-[#9ca3af]">{hoveredModel.version}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
