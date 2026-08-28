"use client";

import { cn } from "@/lib/utils";

export type HubCodeEditorProps = {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  className?: string;
  errorLine?: number;
  readOnly?: boolean;
};

export function HubCodeEditor({
  value,
  onChange,
  rows = 16,
  className,
  errorLine,
  readOnly = false,
}: HubCodeEditorProps) {
  const lines = value.split("\n");

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#0F172A] shadow-sm",
        className,
      )}
    >
      <div className="flex max-h-[420px] overflow-auto">
        <div
          className="select-none border-r border-white/10 bg-[#1E293B] px-3 py-3 text-right font-mono text-[11px] leading-5 text-slate-500"
          aria-hidden
        >
          {lines.map((_, i) => (
            <div
              key={i}
              className={cn(errorLine === i + 1 && "text-red-400 font-semibold")}
            >
              {i + 1}
            </div>
          ))}
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          spellCheck={false}
          rows={rows}
          className="min-h-[200px] w-full resize-none bg-transparent px-3 py-3 font-mono text-[12px] leading-5 text-slate-100 outline-none"
        />
      </div>
    </div>
  );
}
