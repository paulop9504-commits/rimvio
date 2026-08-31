"use client";

import { ChevronDown } from "lucide-react";
import type { HubMvpRuntime } from "@/lib/hub/dev/mvp/use-hub-mvp-runtime";
import { getMvpCapabilityById } from "@/lib/hub/dev/mvp/use-hub-mvp-runtime";

export function HubMvpLoopView({
  runtime,
  loopId,
}: {
  runtime: HubMvpRuntime;
  loopId: string;
}) {
  const loop = runtime.loops.find((row) => row.id === loopId);
  if (!loop) return null;

  return (
    <div className="p-8">
      <h2 className="text-[22px] font-semibold">{loop.name}</h2>
      <p className="mt-1 text-[13px] text-[#86868b]">Capability를 연결해 더 큰 작업을 만듭니다</p>

      <div className="mx-auto mt-10 flex max-w-xs flex-col items-center gap-2">
        {loop.capabilityIds.map((capId, index) => {
          const cap = getMvpCapabilityById(runtime, capId);
          return (
            <div key={capId} className="flex w-full flex-col items-center">
              <div className="w-full rounded-[14px] border bg-white px-4 py-3 text-center shadow-sm">
                <p className="text-[13px] font-semibold">{cap?.name ?? capId}</p>
                <p className="mt-0.5 text-[11px] text-[#86868b]">{cap?.description}</p>
              </div>
              {index < loop.capabilityIds.length - 1 ? (
                <ChevronDown className="my-1 h-4 w-4 text-[#c7c7cc]" />
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex justify-center">
        <button
          type="button"
          onClick={() => runtime.runLoop(loop.id)}
          className="rounded-[12px] bg-[#6b4cff] px-5 py-2.5 text-[13px] font-semibold text-white"
        >
          Run Loop
        </button>
      </div>
    </div>
  );
}
