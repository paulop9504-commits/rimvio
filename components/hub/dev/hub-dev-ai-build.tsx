"use client";

import { Sparkles } from "lucide-react";
import type { PlatformBlueprintView } from "@/lib/hub/dev/platform-nav";
import { AI_BUILD_EXAMPLE_PROMPTS } from "@/lib/hub/dev/platform-nav";
import { cn } from "@/lib/utils";

type HubDevAiBuildProps = {
  prompt: string;
  onPromptChange: (v: string) => void;
  onBuild: () => void;
  building?: boolean;
  blueprint: PlatformBlueprintView | null;
  onCreatePlatform: () => void;
  onSeeDetails: () => void;
};

function BlueprintColumn({
  title,
  items,
  className,
}: {
  title: string;
  items: readonly string[];
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-white/[0.08] bg-[#151820] p-3", className)}>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#6b7684]">
        {title}
      </p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item} className="font-mono text-[11px] text-[#b0b8c1]">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HubDevAiBuild({
  prompt,
  onPromptChange,
  onBuild,
  building,
  blueprint,
  onCreatePlatform,
  onSeeDetails,
}: HubDevAiBuildProps) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto p-6 rimvio-scroll-touch">
      {!blueprint ? (
        <div className="mx-auto w-full max-w-2xl pt-8">
          <h1 className="text-center text-[22px] font-bold text-[#f2f4f6]">AI Build</h1>
          <p className="mt-2 text-center text-[13px] text-[#6b7684]">
            Rimvio Agent · Developer Context — Platform Blueprint를 설계합니다. (별도 Agent 아님)
          </p>

          <div className="mt-8 rounded-2xl border border-[#4593fc]/30 bg-[#151820] p-1 shadow-[0_0_40px_rgba(69,147,252,0.08)]">
            <textarea
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              rows={5}
              placeholder="호텔 예약 플랫폼을 만들어줘. 난바역 주변 호텔을 검색하고 객실을 선택해서 예약하고 결제할 수 있게 해줘. 결제 전에는 반드시 사용자 확인을 받아줘."
              className="w-full resize-none rounded-xl bg-transparent px-4 py-3 text-[13px] leading-relaxed text-[#f2f4f6] placeholder:text-[#6b7684] focus:outline-none"
            />
            <div className="flex justify-end border-t border-white/[0.06] px-3 py-2">
              <button
                type="button"
                onClick={onBuild}
                disabled={building || !prompt.trim()}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4593fc] to-[#6366f1] px-5 py-2 text-[13px] font-semibold text-white hover:opacity-95 disabled:opacity-40"
              >
                <Sparkles className="size-4" />
                {building ? "Analyzing…" : "Build with AI"}
              </button>
            </div>
          </div>

          <div className="mt-6">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#6b7684]">
              Example prompts
            </p>
            <div className="flex flex-wrap gap-2">
              {AI_BUILD_EXAMPLE_PROMPTS.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => onPromptChange(ex)}
                  className="rounded-lg border border-white/[0.08] bg-[#151820] px-3 py-1.5 text-[11px] text-[#b0b8c1] hover:border-[#4593fc]/30"
                >
                  {ex.slice(0, 28)}…
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-4xl">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[20px] font-bold text-[#f2f4f6]">{blueprint.name}</h2>
              <p className="mt-1 text-[13px] text-[#6b7684]">{blueprint.tagline}</p>
            </div>
            <span className="rounded-lg bg-[#4593fc]/15 px-2 py-1 text-[10px] font-semibold text-[#8ec0ff]">
              Platform Blueprint
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <BlueprintColumn title="Capabilities" items={blueprint.capabilities} />
            <BlueprintColumn title="Data" items={blueprint.dataModels} />
            <BlueprintColumn title="Workflows" items={blueprint.workflows} />
            <BlueprintColumn title="Permissions" items={blueprint.permissions} />
            <BlueprintColumn title="Context" items={blueprint.contextFields} />
            <div className="space-y-3">
              <BlueprintColumn title="Runtime" items={[blueprint.runtime]} />
              <BlueprintColumn title="Commerce" items={[blueprint.commerce]} />
            </div>
          </div>

          <p className="mt-4 text-[11px] text-[#6b7684]">
            Manifest · Permissions · Context/I/O는 Create 후 Configuration에서 확인·수정할 수
            있습니다.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onCreatePlatform}
              className="rounded-xl bg-gradient-to-r from-[#4593fc] to-[#6366f1] px-6 py-2.5 text-[13px] font-semibold text-white"
            >
              Start with this Blueprint →
            </button>
            <button
              type="button"
              onClick={onSeeDetails}
              className="rounded-xl border border-white/[0.1] px-6 py-2.5 text-[13px] font-medium text-[#b0b8c1] hover:bg-white/[0.04]"
            >
              See Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
