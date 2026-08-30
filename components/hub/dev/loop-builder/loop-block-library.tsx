"use client";

import { useMemo, useState } from "react";
import { GripVertical, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LOOP_BLOCK_LIBRARY_CATEGORIES,
  LOOP_BLOCK_TEMPLATES,
  LOOP_BLOCK_TEMPLATE_CATEGORIES,
  listBlocksByCategory,
  type LoopBlockLibraryCategory,
  type LoopBlockTemplateCategory,
  type LoopNodeKind,
} from "@/lib/agent-os/loop-builder";
import { CUSTOM_BLOCK_CODE_STUB } from "@/lib/agent-os/loop-builder/custom-block";

type LoopBlockLibraryProps = {
  readonly onAddKind: (kind: LoopNodeKind, config?: Record<string, unknown>) => void;
  readonly onAddTemplate: (templateId: string) => void;
  readonly draftCapabilities: readonly string[];
  readonly onInsertCapability: (name: string) => void;
};

export function LoopBlockLibrary(props: LoopBlockLibraryProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<LoopBlockLibraryCategory>("control");
  const [templateCategory, setTemplateCategory] = useState<LoopBlockTemplateCategory>("core");

  const blocks = useMemo(() => {
    const base = listBlocksByCategory(category);
    if (!query.trim()) return base;
    const q = query.toLowerCase();
    return base.filter((b) => b.label.toLowerCase().includes(q) || b.hintKo.includes(q));
  }, [category, query]);

  const templates = LOOP_BLOCK_TEMPLATES.filter((t) => t.category === templateCategory);

  const onDragStart = (event: React.DragEvent, kind: LoopNodeKind) => {
    event.dataTransfer.setData("application/rimvio-loop-kind", kind);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside className="flex w-[196px] shrink-0 flex-col border-r border-[#e5e7eb] bg-white">
      <div className="border-b border-[#e5e7eb] px-2.5 py-2">
        <p className="text-[9px] font-bold uppercase tracking-wide text-[#9ca3af]">Block Library</p>
        <div className="relative mt-1.5">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-[#9ca3af]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search blocks…"
            className="w-full rounded-lg border border-[#e5e7eb] py-1 pl-7 pr-2 text-[10px] outline-none focus:border-violet-300"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-0.5 border-b border-[#e5e7eb] px-2 py-1.5">
        {LOOP_BLOCK_LIBRARY_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategory(cat.id)}
            className={cn(
              "rounded px-1.5 py-0.5 text-[8px] font-semibold",
              category === cat.id ? "bg-violet-100 text-violet-700" : "text-[#6b7280] hover:bg-[#f3f4f6]",
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {blocks.map((item) => (
            <div
              key={item.kind + item.label}
              draggable
              onDragStart={(e) => onDragStart(e, item.kind)}
              className="group flex cursor-grab items-center gap-1 rounded-lg border border-transparent px-1.5 py-1.5 hover:border-violet-100 hover:bg-violet-50 active:cursor-grabbing"
            >
              <GripVertical className="size-3 shrink-0 text-[#d1d5db] group-hover:text-violet-400" />
              <button
                type="button"
                onClick={() =>
                  props.onAddKind(
                    item.kind,
                    item.kind === "CUSTOM" ? { customCode: CUSTOM_BLOCK_CODE_STUB } : undefined,
                  )
                }
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate text-[10px] font-medium text-[#374151]">{item.label}</p>
                <p className="truncate text-[8px] text-[#9ca3af]">{item.hintKo}</p>
              </button>
              <Plus className="size-3 shrink-0 text-[#c4c9d1] opacity-0 group-hover:opacity-100" />
            </div>
          ))}
        </div>

        <div className="mt-3 border-t border-[#f3f4f6] pt-2">
          <p className="px-1 text-[8px] font-bold uppercase text-[#9ca3af]">Presets</p>
          <div className="mt-1 flex flex-wrap gap-0.5">
            {LOOP_BLOCK_TEMPLATE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setTemplateCategory(cat.id)}
                className={cn(
                  "rounded px-1 py-0.5 text-[7px] font-semibold",
                  templateCategory === cat.id ? "bg-emerald-100 text-emerald-700" : "text-[#9ca3af]",
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="mt-1 max-h-28 space-y-0.5 overflow-y-auto">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                title={t.hintKo}
                onClick={() => props.onAddTemplate(t.id)}
                className="flex w-full items-center gap-1 rounded-md px-1.5 py-1 text-left text-[9px] text-[#374151] hover:bg-emerald-50"
              >
                <Plus className="size-2.5 shrink-0 text-[#9ca3af]" />
                <span className="truncate">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {props.draftCapabilities.length > 0 ? (
          <div className="mt-3 border-t border-[#f3f4f6] pt-2">
            <p className="px-1 text-[8px] font-bold uppercase text-[#9ca3af]">Capabilities</p>
            {props.draftCapabilities.slice(0, 8).map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => props.onInsertCapability(name)}
                className="mt-0.5 w-full truncate rounded-md px-1.5 py-1 text-left text-[9px] text-violet-700 hover:bg-violet-50"
              >
                {name}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
