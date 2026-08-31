"use client";

import type { HubMvpRuntime } from "@/lib/hub/dev/mvp/use-hub-mvp-runtime";
import type { MvpCapability } from "@/lib/hub/dev/mvp/types";

export function HubMvpPublishCard({
  runtime,
  capability,
}: {
  runtime: HubMvpRuntime;
  capability: MvpCapability;
}) {
  const published = capability.status === "published";

  return (
    <div className="flex flex-col items-center justify-center p-10 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b4cff]">
        Capability Ready
      </p>
      <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.03em]">{capability.name}</h2>

      <ul className="mt-6 space-y-2 text-left text-[13px] text-[#3a3a3c]">
        <li>✓ Build complete</li>
        <li>✓ Sandbox test passed</li>
        <li>✓ Output validated</li>
      </ul>

      <div className="mt-8 flex gap-2">
        <button
          type="button"
          onClick={() => runtime.testCapability(capability.id)}
          className="rounded-[12px] border px-5 py-2.5 text-[13px] font-semibold"
        >
          Test Again
        </button>
        {!published ? (
          <button
            type="button"
            onClick={() => runtime.publishCapability(capability.id)}
            className="rounded-[12px] bg-[#6b4cff] px-5 py-2.5 text-[13px] font-semibold text-white"
          >
            Publish Capability
          </button>
        ) : (
          <span className="flex items-center rounded-[12px] bg-[#e8f8ee] px-5 py-2.5 text-[13px] font-semibold text-[#248a3d]">
            Published to Rimvio
          </span>
        )}
      </div>
    </div>
  );
}
