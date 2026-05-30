"use client";

import { useEffect, useState } from "react";
import {
  archiveContextContainer,
  deleteContextContainer,
  runContainerMaintenance,
  type ContextContainer,
} from "@/lib/containers/context-containers";
import { cn } from "@/lib/utils";

type ContainerCleanupPanelProps = {
  className?: string;
};

export function ContainerCleanupPanel({ className }: ContainerCleanupPanelProps) {
  const [suggestions, setSuggestions] = useState<ContextContainer[]>([]);
  const [archivedCount, setArchivedCount] = useState(0);

  useEffect(() => {
    const result = runContainerMaintenance();
    setSuggestions(result.suggestions.slice(0, 3));
    setArchivedCount(result.archived.length);
  }, []);

  if (suggestions.length === 0 && archivedCount === 0) {
    return null;
  }

  return (
    <section
      className={cn(
        "rounded-2xl border border-[#E5E7EB] bg-[#FAFAFF] p-4",
        className
      )}
    >
      <h2 className="text-sm font-semibold text-[#1F2937]">컨테이너 정리</h2>
      <p className="mt-1 text-xs leading-relaxed text-[#6B7280]">
        {archivedCount > 0
          ? `${archivedCount}개는 30일간 열지 않아 자동으로 아카이브했어요.`
          : "오래 열지 않은 컨테이너가 있어요. 필요 없으면 정리할까요?"}
      </p>

      {suggestions.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {suggestions.map((container) => (
            <li
              key={container.id}
              className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-black/[0.04]"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#1F2937]">
                  {container.title}
                </p>
                <p className="text-[11px] text-[#9CA3AF]">
                  {container.itemCount}개 · 마지막 열람{" "}
                  {new Date(container.lastOpenedAt).toLocaleDateString("ko-KR")}
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button
                  type="button"
                  className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-[#6B7280]"
                  onClick={() => archiveContextContainer(container.id)}
                >
                  아카이브
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-[#7B61FF] px-2.5 py-1.5 text-[11px] font-semibold text-white"
                  onClick={() => {
                    deleteContextContainer(container.id);
                    setSuggestions((prev) => prev.filter((item) => item.id !== container.id));
                  }}
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
