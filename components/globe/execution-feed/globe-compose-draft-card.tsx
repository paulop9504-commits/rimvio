"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { ExecutionFeedComposeDraft } from "@/lib/context-run/execution-feed-types";
import { copy } from "@/lib/copy/human-ko";
import { patchComposeDraftField } from "@/lib/portal/compose-draft/patch-compose-draft-field";
import { cn } from "@/lib/utils";

export type GlobeComposeDraftCardProps = {
  graphId: string;
  composeDraft: ExecutionFeedComposeDraft;
  className?: string;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  primaryActionLabelKo?: string | null;
  secondaryActionLabelKo?: string | null;
};

function FieldRow({
  graphId,
  field,
}: {
  graphId: string;
  field: ExecutionFeedComposeDraft["fields"][number];
}) {
  const [editing, setEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(field.valueKo);

  const display = field.valueKo.trim()
    ? field.valueKo.trim()
    : field.required
      ? copy.portal.composeDraftFieldTap
      : copy.portal.composeDraftFieldOptional;

  const commit = () => {
    setEditing(false);
    const next = patchComposeDraftField({
      graphId,
      fieldId: field.id as "productName",
      rawValue: draftValue,
    });
    if (next) {
      const updated =
        field.id === "priceKrw"
          ? next.priceKrw != null
            ? `${next.priceKrw.toLocaleString("ko-KR")}원`
            : ""
          : String(next[field.id as keyof typeof next] ?? "");
      setDraftValue(updated);
    }
  };

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "text-[9px] font-semibold",
            field.valueKo.trim() ? "text-[#5de37a]" : "text-white/40",
          )}
          aria-hidden
        >
          {field.valueKo.trim() ? "✓" : "○"}
        </span>
        <span className="text-[9px] font-medium text-white/55">
          {field.labelKo}
          {!field.required ? (
            <span className="ml-1 text-white/35">
              · {copy.portal.composeDraftFieldOptional}
            </span>
          ) : null}
        </span>
      </div>
      {editing ? (
        field.inputType === "textarea" ? (
          <textarea
            autoFocus
            value={draftValue}
            onChange={(event) => setDraftValue(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                commit();
              }
            }}
            rows={2}
            className="w-full resize-none rounded-[0.65rem] bg-white/8 px-2.5 py-2 text-[11px] text-white ring-1 ring-white/14 outline-none"
          />
        ) : (
          <input
            autoFocus
            type={field.inputType === "number" ? "text" : "text"}
            inputMode={field.inputType === "number" ? "numeric" : "text"}
            value={draftValue}
            onChange={(event) => setDraftValue(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commit();
              }
            }}
            className="w-full rounded-[0.65rem] bg-white/8 px-2.5 py-2 text-[11px] text-white ring-1 ring-white/14 outline-none"
          />
        )
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraftValue(field.valueKo);
            setEditing(true);
          }}
          className={cn(
            "rounded-[0.65rem] px-2.5 py-2 text-left text-[11px] ring-1 transition-colors",
            field.valueKo.trim()
              ? "bg-white/6 text-white/92 ring-white/10 hover:bg-white/10"
              : "bg-white/4 text-white/45 ring-white/8 hover:bg-white/8 hover:text-white/70",
          )}
        >
          {display}
        </button>
      )}
    </div>
  );
}

/** Inline-editable compose draft — no step numbers. */
export function GlobeComposeDraftCard({
  graphId,
  composeDraft,
  className,
  onPrimaryAction,
  onSecondaryAction,
  primaryActionLabelKo,
  secondaryActionLabelKo,
}: GlobeComposeDraftCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "flex flex-col gap-2.5 rounded-[1rem] bg-[#121316]/88 px-3 py-2.5 ring-1 ring-white/12 backdrop-blur-xl",
        className,
      )}
      data-globe-compose-draft-card
      data-globe-compose-draft-schema={composeDraft.schemaId}
    >
      <p className="text-[11px] font-semibold text-white">{composeDraft.schemaLabelKo}</p>

      <div className="flex flex-col gap-2">
        {composeDraft.fields.map((field) => (
          <FieldRow key={field.id} graphId={graphId} field={field} />
        ))}
      </div>

      {composeDraft.canPublish && primaryActionLabelKo ? (
        <div className="flex flex-col gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={onPrimaryAction}
            className="w-full rounded-[0.75rem] bg-white py-2.5 text-[12px] font-semibold text-black shadow-sm"
          >
            {primaryActionLabelKo}
          </button>
          {secondaryActionLabelKo ? (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="w-full rounded-[0.75rem] bg-white/8 py-2 text-[11px] font-medium text-white/85 ring-1 ring-white/12"
            >
              {secondaryActionLabelKo}
            </button>
          ) : null}
        </div>
      ) : null}
    </motion.div>
  );
}
