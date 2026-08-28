"use client";

import type { CapabilityDraft } from "@/lib/hub/capability/types";
import { cn } from "@/lib/utils";

export function CapabilityPreviewCard({
  draft,
  className,
  showRating = false,
}: {
  draft: CapabilityDraft;
  className?: string;
  showRating?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm",
        className,
      )}
    >
      <div className="mb-3 flex items-start gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#F1F5F9] text-lg font-bold text-[#6366F1]">
          {draft.iconDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={draft.iconDataUrl} alt="" className="size-full object-cover" />
          ) : (
            draft.name.slice(0, 1).toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-[#0F172A]">{draft.name || "Untitled"}</p>
          {showRating ? (
            <p className="text-[12px] text-amber-500">★ 4.9</p>
          ) : (
            <p className="text-[11px] text-[#64748B]">v{draft.version}</p>
          )}
          <p className="text-[11px] text-[#94A3B8]">by Dev_Studio</p>
        </div>
      </div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#6366F1]">
        {draft.category.replace("-", " ")}
      </p>
      <div className="mb-3 flex flex-wrap gap-1">
        {draft.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-md bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-medium text-[#475569]"
          >
            {tag}
          </span>
        ))}
      </div>
      <p className="mb-3 line-clamp-3 text-[12px] leading-relaxed text-[#64748B]">
        {draft.description || "Add a description…"}
      </p>
      <div className="space-y-2 border-t border-[#F1F5F9] pt-3 text-[11px]">
        <p className="font-semibold text-[#334155]">Permissions</p>
        <ul className="space-y-0.5 text-[#64748B]">
          {draft.permissions
            .filter((p) => p.enabled)
            .slice(0, 4)
            .map((p) => (
              <li key={p.id}>{p.label}</li>
            ))}
        </ul>
        <p className="pt-1 font-semibold text-[#334155]">Actions</p>
        <ul className="space-y-0.5 text-[#64748B]">
          {draft.actions.slice(0, 4).map((a) => (
            <li key={a.id}>{a.name}</li>
          ))}
        </ul>
        <p className="pt-1 font-semibold text-[#334155]">Runtime</p>
        <p className="text-[#64748B]">{draft.runtime.type}</p>
      </div>
    </div>
  );
}
