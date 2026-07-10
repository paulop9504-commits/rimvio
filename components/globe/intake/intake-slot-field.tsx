"use client";

import { cn } from "@/lib/utils";
import type { IntakeSheetField } from "@/lib/intake/intake-sheet-field-types";

export type IntakeSlotFieldProps = {
  field: IntakeSheetField;
  value: string | number;
  onChange: (value: string | number) => void;
  disabled?: boolean;
};

export function IntakeSlotField({ field, value, onChange, disabled = false }: IntakeSlotFieldProps) {
  if (field.kind === "enum" && field.enumOptions?.length) {
    return (
      <div>
        <span className="mb-1.5 block text-[12px] font-medium text-[#3c3c43]">
          {field.label}
        </span>
        <div className="flex flex-wrap gap-2">
          {field.enumOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              disabled={disabled}
              className={cn(
                "rounded-full px-3 py-2 text-[12px] font-semibold",
                String(value) === option.id
                  ? "bg-[#1d1d1f] text-white"
                  : "bg-[#f5f5f7] text-[#515154]",
              )}
              data-intake-slot-enum={option.id}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (field.kind === "number") {
    return (
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-medium text-[#3c3c43]">
          {field.label}
        </span>
        <input
          type="number"
          min={field.min}
          max={field.max}
          value={value}
          onChange={(event) =>
            onChange(Math.max(field.min ?? 1, Number(event.target.value) || 1))
          }
          disabled={disabled}
          className="w-full rounded-xl border border-[#d2d2d7] px-3 py-3 text-[14px] text-[#1d1d1f] outline-none disabled:opacity-60"
          data-intake-slot-id={field.id}
        />
      </label>
    );
  }

  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-[#3c3c43]">
        {field.label}
      </span>
      <input
        type={field.kind === "date" ? "date" : "text"}
        value={String(value)}
        placeholder={field.placeholder}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="w-full rounded-xl border border-[#d2d2d7] px-3 py-3 text-[14px] text-[#1d1d1f] outline-none disabled:opacity-60"
        data-intake-slot-id={field.id}
      />
    </label>
  );
}
