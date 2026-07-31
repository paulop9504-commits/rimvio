"use client";

/**
 * GPT-style Place Brief blocks — route fit · intro · features · reviews · know-before.
 */

import type { PlaceBrief } from "@/lib/context-workspace/place-brief";

export function WorkspacePlaceBriefSection({
  brief,
  loading,
}: {
  readonly brief: PlaceBrief | null;
  readonly loading?: boolean;
}) {
  if (!brief && !loading) return null;

  return (
    <div className="space-y-4 border-t border-black/[0.06] pt-3.5">
      {brief?.routeFitKo ? (
        <p className="rounded-2xl bg-[#f2f4f6] px-3 py-2.5 text-[13px] font-medium leading-snug text-[#191f28]">
          {brief.routeFitKo}
        </p>
      ) : null}

      {brief?.introKo ? (
        <section>
          <p className="text-[13px] leading-[1.55] text-[#4e5968]">{brief.introKo}</p>
        </section>
      ) : loading ? (
        <p className="text-[12px] text-[#8b95a1]">장소 요약 준비 중…</p>
      ) : null}

      {brief && brief.featuresKo.length > 0 ? (
        <section>
          <h4 className="text-[13px] font-semibold text-[#191f28]">주요 특징</h4>
          <ul className="mt-1.5 space-y-1">
            {brief.featuresKo.map((line) => (
              <li
                key={line}
                className="text-[13px] leading-[1.45] text-[#4e5968] before:mr-1.5 before:text-[#8b95a1] before:content-['·']"
              >
                {line}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {brief?.reviewSummaryKo ? (
        <section>
          <h4 className="text-[13px] font-semibold text-[#191f28]">이용객 평가</h4>
          <p className="mt-1 text-[13px] leading-[1.5] text-[#4e5968]">
            {brief.reviewSummaryKo}
          </p>
        </section>
      ) : null}

      {brief?.atmosphereKo ? (
        <section>
          <h4 className="text-[13px] font-semibold text-[#191f28]">분위기</h4>
          <p className="mt-1 text-[13px] leading-[1.5] text-[#4e5968]">
            {brief.atmosphereKo}
          </p>
        </section>
      ) : null}

      {brief && brief.knowBefore.length > 0 ? (
        <section>
          <h4 className="text-[13px] font-semibold text-[#191f28]">
            알아두면 좋은 점
          </h4>
          <ul className="mt-1.5 space-y-1.5">
            {brief.knowBefore.map((row) => (
              <li
                key={`${row.labelKo}-${row.valueKo}`}
                className="flex gap-2 text-[13px] leading-snug"
              >
                <span className="w-[4.5rem] shrink-0 font-medium text-[#8b95a1]">
                  {row.labelKo}
                </span>
                <span className="min-w-0 flex-1 text-[#4e5968]">{row.valueKo}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {brief?.source === "facts+llm" ? (
        <p className="text-[10px] text-[#b0b8c1]">요약 · 사실 근거 기반</p>
      ) : null}
    </div>
  );
}
