"use client";

import { useEffect, useMemo, useState } from "react";
import { IntakeSlotField } from "@/components/globe/intake/intake-slot-field";
import { rimvioAssistantAiBubbleClass } from "@/lib/design/globe-assistant-surface";
import type { IntakeSlotsComposePayload } from "@/lib/globe/assistant";
import type { IntakeSheetField } from "@/lib/intake/intake-sheet-field-types";
import { cn } from "@/lib/utils";

export type GlobeIntakeSlotsComposeCardProps = {
  turnId: string;
  hint: string;
  payload: IntakeSlotsComposePayload;
  onSubmit?: (input: {
    turnId: string;
    domainId: string;
    values: Record<string, string | number>;
  }) => void;
  className?: string;
};

function initialValues(fields: readonly IntakeSheetField[]): Record<string, string | number> {
  return Object.fromEntries(fields.map((field) => [field.id, field.value]));
}

/** Inline intake form inside the assistant compose thread. */
export function GlobeIntakeSlotsComposeCard({
  turnId,
  hint,
  payload,
  onSubmit,
  className,
}: GlobeIntakeSlotsComposeCardProps) {
  const [values, setValues] = useState<Record<string, string | number>>(() =>
    initialValues(payload.fields),
  );

  useEffect(() => {
    if (payload.status === "open") {
      setValues(initialValues(payload.fields));
    }
  }, [payload.fields, payload.status]);

  const canSubmit = useMemo(() => {
    if (payload.status !== "open") {
      return false;
    }
    return payload.fields.every((field) => {
      const value = values[field.id];
      if (field.kind === "text" || field.kind === "date") {
        return String(value ?? "").trim().length > 0;
      }
      if (field.kind === "number") {
        return Number(value) > 0;
      }
      return String(value ?? "").trim().length > 0;
    });
  }, [payload.fields, payload.status, values]);

  const submitted = payload.status === "submitted";

  return (
    <div
      className={cn("max-w-[88%] space-y-2", className)}
      data-globe-intake-slots-compose
      data-globe-intake-domain={payload.domainId}
    >
      <p className={rimvioAssistantAiBubbleClass("text-[13px]")}>{hint}</p>
      <div
        className={cn(
          "space-y-3 rounded-2xl bg-[#f5f5f7] p-3 ring-1 ring-black/[0.04]",
          submitted && "opacity-70",
        )}
      >
        {payload.fields.map((field) => (
          <IntakeSlotField
            key={field.id}
            field={field}
            value={values[field.id] ?? field.value}
            disabled={submitted}
            onChange={(next) =>
              setValues((current) => ({ ...current, [field.id]: next }))
            }
          />
        ))}

        {submitted && payload.submittedSummaryKo ? (
          <p className="text-[12px] font-medium text-[#0071e3]">
            {payload.submittedSummaryKo}
          </p>
        ) : (
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() =>
              onSubmit?.({
                turnId,
                domainId: payload.domainId,
                values,
              })
            }
            className="w-full rounded-xl bg-[#0071e3] px-4 py-3 text-[14px] font-semibold text-white disabled:opacity-40"
            data-globe-intake-submit
          >
            {payload.submitLabel}
          </button>
        )}
      </div>
    </div>
  );
}
