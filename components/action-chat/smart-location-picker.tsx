"use client";

import { MapPin, Search } from "lucide-react";
import { useMemo, useState } from "react";
import {
  buildLocationSuggestions,
  filterLocationSuggestions,
} from "@/lib/corrections/location-suggestions";
import type { ConfirmationExtractedData, LocationSuggestion } from "@/lib/action-chat/confirmation-types";
import { isSystemQuery } from "@/lib/action-chat/confirm-input-guard";
import { cn } from "@/lib/utils";

type SmartLocationPickerProps = {
  open: boolean;
  extracted?: ConfirmationExtractedData | null;
  onSelect: (suggestion: LocationSuggestion) => void;
  className?: string;
};

export function SmartLocationPicker({
  open,
  extracted,
  onSelect,
  className,
}: SmartLocationPickerProps) {
  const [query, setQuery] = useState("");

  const suggestions = useMemo(
    () => {
      if (isSystemQuery(query)) {
        return [];
      }
      return filterLocationSuggestions(
        buildLocationSuggestions({
          place_name: extracted?.place_name,
          address: extracted?.address,
          query,
        }),
        query
      );
    },
    [extracted?.address, extracted?.place_name, query]
  );

  if (!open) {
    return null;
  }

  return (
    <div
      className={cn(
        "smart-location-picker rounded-2xl border border-[#4A90E2]/20 bg-white/95 p-3 shadow-[0_8px_32px_rgba(74,144,226,0.12)]",
        className
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-xl bg-[#4A90E2]/10 text-[#4A90E2]">
          <MapPin className="size-4" />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-[#1F2937]">Smart Location Picker</p>
          <p className="text-[11px] text-[#6B7280]">탭 한 번으로 위치를 보정하세요</p>
        </div>
      </div>

      <label className="relative mb-2 block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9CA3AF]" />
        <input
          value={query}
          onChange={(event) => {
            const next = event.target.value;
            if (isSystemQuery(next)) {
              return;
            }
            setQuery(next);
          }}
          placeholder="장소 검색"
          className="w-full rounded-xl border border-black/8 bg-[#F9FAFB] py-2.5 pl-9 pr-3 text-[13px] outline-none focus:border-[#4A90E2]/35"
        />
      </label>

      <ul className="max-h-48 space-y-1 overflow-y-auto">
        {suggestions.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item)}
              className="flex w-full flex-col rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[#4A90E2]/8"
            >
              <span className="text-[13px] font-semibold text-[#1F2937]">{item.label}</span>
              <span className="text-[11px] text-[#6B7280]">{item.address}</span>
            </button>
          </li>
        ))}
        {suggestions.length === 0 ? (
          <li className="px-2 py-3 text-center text-[12px] text-[#9CA3AF]">
            주변 후보가 없습니다. 검색어를 바꿔 보세요.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
