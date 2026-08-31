"use client";

import { useEffect, useState } from "react";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import {
  invokeExperienceResource,
  type ExperienceResourceOp,
} from "@/lib/hub/dev/experience-os";
import { HubAskRimvioBar } from "@/components/hub/dev/hub-ask-rimvio-bar";

type HubExperienceResourcePaneProps = {
  readonly title: string;
  readonly description: string;
  readonly draft: PlatformDraft;
  readonly listOp: ExperienceResourceOp;
  readonly listKey: string;
  readonly emptyPrompt: string;
  readonly createLabel: string;
  readonly createOp: ExperienceResourceOp;
  readonly createName?: string;
  readonly onAsk: (text: string) => void;
  readonly onDraftPatch?: (patch: Partial<PlatformDraft>) => void;
};

export function HubExperienceResourcePane(props: HubExperienceResourcePaneProps) {
  const [items, setItems] = useState<string[]>([]);
  const [busy, setBusy] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setBusy("loading");
    void invokeExperienceResource(props.listOp, {}, { draft: props.draft }).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setBusy("error");
        setError(result.errorKo ?? "load failed");
        return;
      }
      const data = result.data as Record<string, unknown>;
      const raw = data[props.listKey];
      const names = Array.isArray(raw)
        ? raw.map((item) => (typeof item === "string" ? item : String((item as { name?: string }).name ?? "")))
        : [];
      setItems(names.filter(Boolean));
      setBusy("idle");
    });
    return () => {
      cancelled = true;
    };
  }, [props.draft, props.listOp, props.listKey]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[#f4f5f7] p-4 rimvio-scroll-touch">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9ca3af]">{props.title}</p>
      <p className="mt-1 text-[12px] text-[#6b7280]">{props.description}</p>

      {busy === "loading" ? (
        <p className="mt-4 text-[11px] text-[#9ca3af]">불러오는 중…</p>
      ) : items.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-[#d1d5db] bg-white p-4">
          <p className="text-[12px] text-[#6b7280]">{props.emptyPrompt}</p>
          <HubAskRimvioBar placeholder={props.emptyPrompt} onAsk={props.onAsk} />
        </div>
      ) : (
        <ul className="mt-4 space-y-1.5">
          {items.map((name) => (
            <li
              key={name}
              className="rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 font-mono text-[11px] text-[#374151] shadow-sm"
            >
              {name}
            </li>
          ))}
        </ul>
      )}

      {error ? <p className="mt-2 text-[11px] text-red-600">{error}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            void invokeExperienceResource(
              props.createOp,
              { name: props.createName ?? `new_${props.listKey}` },
              { draft: props.draft, updateDraft: props.onDraftPatch },
            ).then((result) => {
              if (result.ok) {
                const name = String((result.data as { name?: string })?.name ?? props.createName);
                setItems((prev) => [...new Set([...prev, name])]);
              } else {
                setError(result.errorKo ?? "create failed");
              }
            });
          }}
          className="rounded-lg bg-violet-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-violet-700"
        >
          {props.createLabel}
        </button>
      </div>

      <HubAskRimvioBar placeholder="✦ Ask Rimvio" onAsk={props.onAsk} />
    </div>
  );
}
