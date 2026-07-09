"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { IntakeSlotField } from "@/components/globe/intake/intake-slot-field";
import { copy } from "@/lib/copy/human-ko";
import type { IntakeSheetField } from "@/lib/intake/intake-sheet-field-types";

export type GlobeIntakeSheetProps = {
  open: boolean;
  title: string;
  hint: string;
  fields: readonly IntakeSheetField[];
  submitLabel: string;
  domainId: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: Record<string, string | number>) => void;
};

function initialValues(fields: readonly IntakeSheetField[]): Record<string, string | number> {
  return Object.fromEntries(fields.map((field) => [field.id, field.value]));
}

/** Generic Field intake sheet — renders slot fields from domain definitions. */
export function GlobeIntakeSheet({
  open,
  title,
  hint,
  fields,
  submitLabel,
  domainId,
  onOpenChange,
  onSubmit,
}: GlobeIntakeSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [values, setValues] = useState<Record<string, string | number>>(() =>
    initialValues(fields),
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    setValues(initialValues(fields));
  }, [fields, open]);

  const canSubmit = useMemo(() => {
    return fields.every((field) => {
      const value = values[field.id];
      if (field.kind === "text" || field.kind === "date") {
        return String(value ?? "").trim().length > 0;
      }
      if (field.kind === "number") {
        return Number(value) > 0;
      }
      return String(value ?? "").trim().length > 0;
    });
  }, [fields, values]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-globe-intake-sheet
          data-globe-intake-domain={domainId}
        >
          <button
            type="button"
            className="absolute inset-0"
            aria-label={copy.common.close}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            className="relative max-h-[min(88vh,640px)] w-full max-w-md overflow-y-auto rounded-[1.5rem] bg-white p-4 shadow-[0_24px_56px_rgba(0,0,0,0.22)]"
            initial={{ y: 32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-[18px] font-semibold text-[#1d1d1f]">{title}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-[#6e6e73]">{hint}</p>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f5f5f7] text-[#6e6e73]"
                aria-label={copy.common.close}
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3">
              {fields.map((field) => (
                <IntakeSlotField
                  key={field.id}
                  field={field}
                  value={values[field.id] ?? field.value}
                  onChange={(next) =>
                    setValues((current) => ({ ...current, [field.id]: next }))
                  }
                />
              ))}
            </div>

            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => onSubmit(values)}
              className="mt-4 w-full rounded-xl bg-[#0071e3] px-4 py-3 text-[14px] font-semibold text-white disabled:opacity-40"
              data-globe-intake-submit
            >
              {submitLabel}
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
