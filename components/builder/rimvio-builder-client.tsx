"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { HubHeader } from "@/components/hub/layout/hub-header";
import { HubSidebar } from "@/components/hub/layout/hub-sidebar";
import {
  BuilderBlueprintPanel,
  BuilderLivePreview,
  BuilderProjectTree,
} from "@/components/builder/builder-panels";
import { summarizeBlueprintKo } from "@/lib/platform-builder";
import { useRimvioBuilder } from "@/hooks/use-rimvio-builder";
import { stashPendingManifest } from "@/lib/hub/capability/manifest-bridge";
import { cn } from "@/lib/utils";

const VIEW_TABS = [
  { id: "visual" as const, label: "Visual" },
  { id: "logic" as const, label: "Logic" },
  { id: "data" as const, label: "Data" },
  { id: "code" as const, label: "Code" },
];

const FEATURE_CHIPS = [
  { id: "payments", label: "결제 추가" },
  { id: "location", label: "위치 기반 검색" },
  { id: "ai_price", label: "AI 가격 추천" },
];

export function RimvioBuilderClient() {
  const builder = useRimvioBuilder();
  const [draft, setDraft] = useState("");
  const [treeSelection, setTreeSelection] = useState("home");

  if (!builder.hydrated) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#F8FAFC] text-[#64748B]">
        Loading…
      </div>
    );
  }

  const { session, platformRir, manifest, manifestValidation } = builder;
  const isLive = session.phase === "preview" || session.phase === "test";
  const lastChange = session.changeLog[session.changeLog.length - 1];
  const showLocation = platformRir?.features.includes("location_on_cards");

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    builder.submitUtterance(text);
    setDraft("");
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-[#F8FAFC]">
      <HubSidebar />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <HubHeader />

        <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-white px-4 py-2">
          <div className="flex items-center gap-3">
            <Link
              href="/hub"
              className="flex items-center gap-1 text-[12px] text-[#64748B] hover:text-[#0F172A]"
            >
              <ArrowLeft className="size-3.5" />
              Hub
            </Link>
            <h1 className="text-[14px] font-semibold text-[#0F172A]">Rimvio Builder</h1>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                isLive ? "bg-[#ECFDF5] text-[#059669]" : "bg-[#F1F5F9] text-[#94A3B8]",
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  isLive ? "bg-[#10B981]" : "bg-[#CBD5E1]",
                )}
              />
              {isLive ? "Live" : "Draft"}
            </span>
          </div>
          <div className="flex rounded-lg border border-[#E2E8F0] p-0.5">
            {VIEW_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => builder.setViewMode(tab.id)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-semibold",
                  session.viewMode === tab.id
                    ? "bg-[#6366F1] text-white"
                    : "text-[#64748B]",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-[180px] shrink-0 border-r border-[#E2E8F0] bg-white p-3 lg:block">
            <BuilderProjectTree
              rir={platformRir}
              selectedId={treeSelection}
              onSelect={setTreeSelection}
            />
          </aside>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto p-4 rimvio-scroll-touch">
              {session.viewMode === "visual" ? (
                <div className="grid h-full gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
                  <div className="space-y-4">
                    {!platformRir && session.phase === "describe" ? (
                      <div className="rounded-xl border border-[#E2E8F0] bg-white p-6">
                        <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#6366F1]">
                          <Sparkles className="size-5" />
                        </div>
                        <h2 className="text-[18px] font-semibold text-[#0F172A]">
                          무엇을 만들고 싶나요?
                        </h2>
                        <p className="mt-2 text-[13px] text-[#64748B]">
                          예: 동네 사람들이 안 쓰는 물건을 사고팔 수 있는 서비스를 만들고 싶어.
                        </p>
                      </div>
                    ) : null}

                    {session.pendingClarification ? (
                      <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
                        <p className="text-[14px] font-medium text-[#0F172A]">
                          {session.pendingClarification.question}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {session.pendingClarification.options?.map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => builder.selectClarifyOption(opt)}
                              className="rounded-full border border-[#E2E8F0] px-3 py-1.5 text-[12px] font-medium text-[#334155] hover:border-[#6366F1] hover:text-[#6366F1]"
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {platformRir &&
                    (session.phase === "blueprint" || session.phase === "preview") ? (
                      <BuilderBlueprintPanel
                        rir={platformRir}
                        onGenerate={builder.generatePlatform}
                        phase={session.phase}
                      />
                    ) : null}

                    {platformRir && session.phase === "blueprint" ? (
                      <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                        <p className="mb-2 text-[12px] font-semibold text-[#334155]">
                          제가 이해한 구조
                        </p>
                        <ul className="space-y-1">
                          {summarizeBlueprintKo(platformRir).map((line) => (
                            <li key={line} className="text-[12px] text-[#64748B]">
                              {line}
                            </li>
                          ))}
                        </ul>
                        <p className="mt-3 text-[12px] text-[#64748B]">추가하고 싶은 것이 있나요?</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {FEATURE_CHIPS.map((chip) => (
                            <button
                              key={chip.id}
                              type="button"
                              onClick={() => builder.addFeatureChip(chip.id)}
                              className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-[#6366F1] ring-1 ring-[#E2E8F0]"
                            >
                              {chip.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {lastChange && session.phase === "preview" ? (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800">
                        ✓ {lastChange.summaryKo}
                      </div>
                    ) : null}

                    {session.phase === "generate" ? (
                      <div className="flex items-center gap-2 text-[13px] text-[#64748B]">
                        <Loader2 className="size-4 animate-spin text-[#6366F1]" />
                        Generating platform…
                      </div>
                    ) : null}
                  </div>

                  <div className="min-h-[320px] overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm lg:min-h-0">
                    <BuilderLivePreview
                      rir={platformRir}
                      platformName={platformRir?.product.name ?? "Preview"}
                      showLocationOnCards={showLocation}
                    />
                  </div>
                </div>
              ) : null}

              {session.viewMode === "logic" && platformRir ? (
                <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
                  <p className="mb-3 text-[12px] font-semibold text-[#334155]">Actions & Workflows</p>
                  <ul className="space-y-2">
                    {platformRir.actions.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center justify-between rounded-lg bg-[#F8FAFC] px-3 py-2 font-mono text-[12px]"
                      >
                        <span>{a.label}</span>
                        <span className="text-[#94A3B8]">{a.capabilityId}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {session.viewMode === "data" && platformRir ? (
                <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
                  <p className="mb-3 text-[12px] font-semibold text-[#334155]">Collections</p>
                  <ul className="space-y-3">
                    {platformRir.objects.map((obj) => (
                      <li key={obj.id} className="rounded-lg border border-[#F1F5F9] p-3">
                        <p className="font-mono text-[13px] font-semibold">{obj.collection}</p>
                        <p className="mt-1 text-[11px] text-[#64748B]">
                          {obj.fields.join(" · ")}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {session.viewMode === "code" && manifest ? (
                <pre className="overflow-auto rounded-xl bg-[#0F172A] p-4 font-mono text-[11px] leading-relaxed text-slate-200">
                  {JSON.stringify(manifest, null, 2)}
                </pre>
              ) : null}

              {builder.capabilityRir ? (
                <div className="mt-4 rounded-xl border border-[#E2E8F0] bg-white p-4">
                  <p className="text-[13px] font-semibold">New Capability</p>
                  <p className="mt-1 text-[15px] font-semibold text-[#0F172A]">
                    {builder.capabilityRir.capability.name}
                  </p>
                  <p className="mt-2 font-mono text-[11px] text-[#64748B]">
                    {builder.capabilityRir.capability.id}
                  </p>
                  <p className="mt-3 text-[12px] text-[#64748B]">
                    이 기능을 {builder.capabilityRir.hostPlatformId}에서 사용할 수 있게 연결할까요?
                  </p>
                  <button
                    type="button"
                    className="mt-3 rounded-lg bg-[#6366F1] px-4 py-2 text-[12px] font-semibold text-white"
                  >
                    Connect Platform
                  </button>
                </div>
              ) : null}
            </div>

            <footer className="border-t border-[#E2E8F0] bg-white p-4">
              <div className="mx-auto flex max-w-3xl gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Tell Rimvio what to change..."
                  className="flex-1 rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1]/30"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!draft.trim()}
                  className="rounded-xl bg-[#6366F1] px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-40"
                >
                  Send
                </button>
              </div>
              <div className="mx-auto mt-2 flex max-w-3xl flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] text-[#94A3B8]">
                  Describe → Blueprint → Preview → Test → Publish
                </p>
                <div className="flex gap-2">
                  {platformRir && session.phase === "preview" ? (
                    <>
                      <button
                        type="button"
                        onClick={builder.runTest}
                        className="rounded-lg border border-[#E2E8F0] px-3 py-1 text-[11px] font-semibold text-[#64748B]"
                      >
                        Run Test
                      </button>
                      <Link
                        href="/hub/submit"
                        onClick={() => {
                          if (manifest && manifestValidation?.valid) {
                            stashPendingManifest(manifest);
                          }
                        }}
                        className={cn(
                          "rounded-lg px-3 py-1 text-[11px] font-semibold text-white",
                          manifestValidation?.valid
                            ? "bg-[#6366F1]"
                            : "pointer-events-none bg-[#CBD5E1]",
                        )}
                      >
                        Submit Review
                      </Link>
                    </>
                  ) : null}
                  <button
                    type="button"
                    onClick={builder.resetBuilder}
                    className="text-[11px] text-[#94A3B8] hover:underline"
                  >
                    New project
                  </button>
                </div>
              </div>
              {session.testPassed ? (
                <p className="mx-auto mt-1 max-w-3xl text-[11px] text-emerald-600">
                  ✓ Sandbox test passed — manifest is valid
                </p>
              ) : null}
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
