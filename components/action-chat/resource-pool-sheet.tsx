"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, Database, ExternalLink, X } from "lucide-react";
import { useResourcePool } from "@/hooks/use-resource-pool";
import type { KnowledgeEntity } from "@/lib/knowledge/knowledge-entity-types";
import { cn } from "@/lib/utils";

type ResourcePoolSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenLink?: (linkId: string) => void;
};

function ResourceRow({
  entity,
  onOpenLink,
}: {
  entity: KnowledgeEntity;
  onOpenLink?: (linkId: string) => void;
}) {
  const isLink = Boolean(entity.sourceLinkId);

  return (
    <li className="rounded-2xl border border-black/[0.06] bg-[#F9FAFB] p-3">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#6366F1] shadow-sm">
          <Bookmark className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-[#1F2937]">{entity.label}</p>
          <p className="mt-0.5 truncate text-[12px] text-[#6B7280]">{entity.value}</p>
          <p className="mt-1 text-[10px] text-[#9CA3AF]">수동 저장 · 알람 없음</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {isLink && entity.sourceLinkId ? (
          <button
            type="button"
            onClick={() => onOpenLink?.(entity.sourceLinkId!)}
            className="rounded-xl border border-black/[0.08] bg-white px-3 py-2 text-[12px] font-semibold text-[#374151]"
          >
            링크 열기
          </button>
        ) : (
          <a
            href={entity.value.startsWith("http") ? entity.value : undefined}
            target="_blank"
            rel="noreferrer"
            className={cn(
              "inline-flex items-center gap-1 rounded-xl border border-black/[0.08] bg-white px-3 py-2 text-[12px] font-semibold text-[#374151]",
              !entity.value.startsWith("http") && "pointer-events-none opacity-50"
            )}
          >
            <ExternalLink className="size-3.5" />
            열기
          </a>
        )}
      </div>
    </li>
  );
}

export function ResourcePoolSheet({
  open,
  onOpenChange,
  onOpenLink,
}: ResourcePoolSheetProps) {
  const [mounted, setMounted] = useState(false);
  const { items, loading } = useResourcePool();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="닫기"
            className="fixed inset-0 z-[80] bg-black/35"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-label="리소스 풀"
            className="fixed inset-x-0 bottom-0 z-[81] mx-auto flex max-h-[min(78vh,640px)] max-w-lg flex-col rounded-t-[24px] border border-black/5 bg-white shadow-[0_-12px_40px_rgba(0,0,0,0.12)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          >
            <div className="flex items-center justify-between border-b border-black/[0.04] px-5 pb-3 pt-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-[#6366F1]/12 text-[#6366F1]">
                  <Database className="size-4" />
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-[#1F2937]">리소스 풀</p>
                  <p className="text-[11px] text-[#6B7280]">
                    Knowledge Hub · 알람 없이 저장된 링크·메모
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex size-8 items-center justify-center rounded-full text-[#6B7280] hover:bg-black/[0.04]"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              {loading ? (
                <p className="py-8 text-center text-[13px] text-[#9CA3AF]">불러오는 중…</p>
              ) : items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-black/10 bg-[#F9FAFB] px-4 py-8 text-center">
                  <p className="text-[14px] font-medium text-[#374151]">저장된 리소스가 없어요</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-[#9CA3AF]">
                    링크를 데이터 슬롯에 Snap하거나 &quot;나중에 봐&quot;라고 말해 보세요.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {items.map((entity) => (
                    <ResourceRow key={entity.id} entity={entity} onOpenLink={onOpenLink} />
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
