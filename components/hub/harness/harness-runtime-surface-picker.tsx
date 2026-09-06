"use client";

import { Monitor, Globe2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HarnessSandboxSurface } from "@/lib/harness/labelling";

export function HarnessRuntimeSurfacePicker({
  value,
  onChange,
  disabled,
}: {
  value: HarnessSandboxSurface | null;
  onChange: (surface: HarnessSandboxSurface) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("web")}
        className={cn(
          "flex flex-col items-start gap-2 rounded-2xl border px-4 py-4 text-left transition",
          value === "web"
            ? "border-[#6366F1] bg-[#EEF2FF] shadow-sm"
            : "border-[#E2E8F0] bg-white hover:border-[#C7D2FE]",
          disabled && "opacity-50",
        )}
      >
        <Globe2 className="h-5 w-5 text-[#6366F1]" />
        <div className="text-[15px] font-semibold text-[#0F172A]">Web</div>
        <p className="text-[12px] leading-snug text-[#64748B]">
          브라우저(sandbox)에서 페이지를 보고 CLICK · TYPE · EXTRACT를 라벨링합니다.
        </p>
        <span className="text-[11px] font-medium text-[#6366F1]">runtime: BROWSER</span>
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("local")}
        className={cn(
          "flex flex-col items-start gap-2 rounded-2xl border px-4 py-4 text-left transition",
          value === "local"
            ? "border-[#6366F1] bg-[#EEF2FF] shadow-sm"
            : "border-[#E2E8F0] bg-white hover:border-[#C7D2FE]",
          disabled && "opacity-50",
        )}
      >
        <Monitor className="h-5 w-5 text-[#6366F1]" />
        <div className="text-[15px] font-semibold text-[#0F172A]">Local</div>
        <p className="text-[12px] leading-snug text-[#64748B]">
          PC/Desktop agent에서 로컬 앱·창 행동을 순차로 라벨링합니다.
        </p>
        <span className="text-[11px] font-medium text-[#6366F1]">runtime: DESKTOP</span>
      </button>
    </div>
  );
}
