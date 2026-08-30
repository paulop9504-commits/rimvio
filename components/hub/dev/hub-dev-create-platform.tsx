"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { GitBranch, Link2, Sparkles, Upload } from "lucide-react";
import {
  analyzePlatformIngress,
  type PlatformIngressKind,
} from "@/lib/hub/dev/platform-analyzer";
import {
  applyExperienceBlueprintToDraft,
  experienceBlueprintFromTemplate,
  experienceBlueprintFromUtterance,
  invokeExperienceResource,
  listExperienceTemplates,
  refineExperienceBlueprint,
  type ExperienceBlueprint,
  type ExperienceBuildStep,
  type ExperienceTemplateId,
} from "@/lib/hub/dev/experience-os";
import { HubDevBlueprintReview } from "@/components/hub/dev/hub-dev-blueprint-review";
import { HubExperienceGraph } from "@/components/hub/dev/hub-experience-graph";
import {
  metaFromDraft,
  setActivePlatformId,
  upsertPlatform,
} from "@/lib/hub/dev/platform-registry";
import { cn } from "@/lib/utils";

type IngressTab = PlatformIngressKind | "describe";

const INGRESS_TABS: { id: IngressTab; label: string }[] = [
  { id: "describe", label: "Idea" },
  { id: "github", label: "GitHub" },
  { id: "upload", label: "Upload" },
  { id: "api", label: "API" },
  { id: "openapi", label: "OpenAPI" },
  { id: "mcp", label: "MCP" },
];

type Stage = "compose" | "blueprint" | "building";

export function HubDevCreatePlatform() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<IngressTab>("describe");
  const [value, setValue] = useState("");
  const [refine, setRefine] = useState("");
  const [stage, setStage] = useState<Stage>("compose");
  const [experience, setExperience] = useState<ExperienceBlueprint | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState<Awaited<ReturnType<typeof analyzePlatformIngress>> | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [buildSteps, setBuildSteps] = useState<ExperienceBuildStep[]>([]);
  const [buildPercent, setBuildPercent] = useState(0);

  useEffect(() => {
    const idea = searchParams.get("idea")?.trim();
    if (!idea) return;
    setValue(idea);
    setTab("describe");
    const bp = experienceBlueprintFromUtterance(idea);
    setExperience(bp);
    setStage("blueprint");
  }, [searchParams]);

  const showBlueprint = useCallback((bp: ExperienceBlueprint, idea: string) => {
    setExperience(bp);
    setValue(idea);
    setStage("blueprint");
    setError(null);
  }, []);

  const handleIdeaBuild = useCallback(() => {
    const idea = value.trim();
    if (!idea) return;
    if (tab === "describe") {
      showBlueprint(experienceBlueprintFromUtterance(idea), idea);
      return;
    }
    setAnalyzing(true);
    setError(null);
    void analyzePlatformIngress({
      kind: tab,
      value: idea,
    }).then((result) => {
      setAnalyzing(false);
      if (!result) {
        setError("분석할 수 없습니다. URL·설명을 확인해 주세요.");
        return;
      }
      setAnalyzed(result);
    });
  }, [tab, value, showBlueprint]);

  const persistAndOpen = useCallback(
    (draftId: string) => {
      router.push(`/hub/workspace?platform=${encodeURIComponent(draftId)}&pane=ade`);
    },
    [router],
  );

  const handleConfirmAnalyzed = useCallback(() => {
    if (!analyzed) return;
    const meta = metaFromDraft(analyzed.draft, analyzed.ingressLabel, {
      status: "agent_ready",
      rimvioCertified: analyzed.certification.filter((c) => c.passed).length >= 6,
    });
    upsertPlatform({ meta, draft: analyzed.draft });
    setActivePlatformId(analyzed.draft.id);
    persistAndOpen(analyzed.draft.id);
  }, [analyzed, persistAndOpen]);

  const handleBuildExperience = useCallback(async () => {
    if (!experience) return;
    setStage("building");
    setError(null);
    let draft = applyExperienceBlueprintToDraft(experience);
    const result = await invokeExperienceResource(
      "experience.build",
      { utterance: value || experience.titleKo },
      {
        draft,
        updateDraft: (patch) => {
          draft = { ...draft, ...patch };
        },
      },
    );
    const data = result.data as { steps?: ExperienceBuildStep[]; progress?: number };
    if (data.steps) setBuildSteps(data.steps);
    setBuildPercent(data.progress ?? (result.ok ? 100 : 0));
    if (!result.ok) {
      setError(result.errorKo ?? "Build failed");
      return;
    }
    const meta = metaFromDraft(draft, "Create Experience", {
      status: "agent_ready",
      rimvioCertified: true,
    });
    upsertPlatform({ meta, draft });
    setActivePlatformId(draft.id);
    persistAndOpen(draft.id);
  }, [experience, persistAndOpen, value]);

  if (analyzed) {
    return (
      <HubDevBlueprintReview
        blueprint={analyzed}
        onBack={() => setAnalyzed(null)}
        onConfirm={handleConfirmAnalyzed}
        onTest={handleConfirmAnalyzed}
      />
    );
  }

  return (
    <div className="min-h-dvh bg-[#0c0e12] text-[#f2f4f6]">
      <header className="flex h-12 items-center justify-between border-b border-white/[0.06] px-6">
        <Link href="/hub" className="text-[14px] font-bold">
          Rimvio
        </Link>
        <Link href="/hub" className="text-[12px] text-[#6b7684] hover:text-[#b0b8c1]">
          ← My Experiences
        </Link>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-14">
        {stage === "compose" ? (
          <>
            <p className="text-center text-[11px] font-semibold uppercase tracking-widest text-[#6b7684]">
              Create Experience
            </p>
            <h1 className="mt-3 text-center text-[26px] font-bold tracking-tight">
              What do you want to build?
            </h1>
            <p className="mt-2 text-center text-[13px] text-[#6b7684]">
              아이디어를 입력하면 코드가 아니라 Experience Blueprint가 먼저 만들어집니다.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-2">
              {INGRESS_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors",
                    tab === t.id
                      ? "bg-[#4593fc]/20 text-[#8ec0ff]"
                      : "border border-white/[0.08] text-[#6b7684] hover:border-[#4593fc]/30",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-white/[0.08] bg-[#151820] p-1">
              {tab === "github" ? (
                <div className="flex items-center gap-2 px-3 py-2 text-[#6b7684]">
                  <GitBranch className="size-4 shrink-0" />
                  <input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="https://github.com/xxxx/market"
                    className="min-w-0 flex-1 bg-transparent text-[13px] text-[#f2f4f6] placeholder:text-[#6b7684] focus:outline-none"
                  />
                </div>
              ) : tab === "upload" ? (
                <label className="flex cursor-pointer items-center gap-2 px-3 py-4 text-[13px] text-[#6b7684]">
                  <Upload className="size-4" />
                  <span>ZIP 또는 소스 경로</span>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="./my-service.zip"
                    className="ml-auto min-w-0 flex-1 bg-transparent text-[#f2f4f6] focus:outline-none"
                  />
                </label>
              ) : tab === "describe" ? (
                <textarea
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  rows={4}
                  placeholder="여행 예약 플랫폼을 만들어줘"
                  className="w-full resize-none bg-transparent px-4 py-3 text-[13px] text-[#f2f4f6] placeholder:text-[#6b7684] focus:outline-none"
                />
              ) : (
                <div className="flex items-center gap-2 px-3 py-2">
                  <Link2 className="size-4 shrink-0 text-[#6b7684]" />
                  <input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={
                      tab === "openapi"
                        ? "https://api.example.com/openapi.json"
                        : tab === "mcp"
                          ? "mcp://server-name"
                          : "https://api.example.com"
                    }
                    className="min-w-0 flex-1 bg-transparent text-[13px] text-[#f2f4f6] placeholder:text-[#6b7684] focus:outline-none"
                  />
                </div>
              )}

              <div className="flex justify-center border-t border-white/[0.06] px-3 py-4">
                <button
                  type="button"
                  disabled={analyzing || !value.trim()}
                  onClick={() => void handleIdeaBuild()}
                  className="flex min-w-[200px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#4593fc] to-[#6366f1] px-6 py-2.5 text-[14px] font-semibold text-white hover:opacity-95 disabled:opacity-40"
                >
                  <Sparkles className="size-4" />
                  {analyzing ? "Building…" : tab === "describe" ? "Build →" : "Analyze"}
                </button>
              </div>
            </div>

            <p className="mt-6 text-center text-[11px] font-semibold uppercase tracking-wide text-[#6b7684]">
              Start with
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {listExperienceTemplates().map((id) => {
                const bp = experienceBlueprintFromTemplate(id as ExperienceTemplateId);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => showBlueprint(bp, `${bp.titleKo} 만들어줘`)}
                    className="rounded-full border border-white/[0.1] px-3 py-1 text-[11px] text-[#b0b8c1] hover:border-[#4593fc]/40 hover:text-white"
                  >
                    {bp.title}
                  </button>
                );
              })}
            </div>
          </>
        ) : null}

        {stage === "blueprint" && experience ? (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6b7684]">
              Experience Blueprint
            </p>
            <h1 className="mt-2 text-[24px] font-bold">{experience.titleKo}</h1>
            <p className="mt-1 text-[13px] text-[#6b7684]">
              Pages {experience.pages.length} · Data {experience.data.length} · Capabilities{" "}
              {experience.capabilities.length}
            </p>
            <div className="mt-6 rounded-2xl border border-white/[0.08] bg-white p-2">
              <HubExperienceGraph blueprint={experience} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <BlueprintList title="Pages" items={experience.pages} />
              <BlueprintList title="Data" items={experience.data} />
              <BlueprintList title="Capabilities" items={experience.capabilities} />
            </div>
            <div className="mt-5 rounded-xl border border-white/[0.08] bg-[#151820] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6b7684]">
                Refine
              </p>
              <input
                value={refine}
                onChange={(e) => setRefine(e.target.value)}
                placeholder="의류 대신 중고 카메라 거래 플랫폼으로 바꿔줘"
                className="mt-2 w-full bg-transparent text-[13px] text-[#f2f4f6] placeholder:text-[#6b7684] focus:outline-none"
              />
              <button
                type="button"
                disabled={!refine.trim()}
                onClick={() => {
                  setExperience((prev) => (prev ? refineExperienceBlueprint(prev, refine.trim()) : prev));
                  setRefine("");
                }}
                className="mt-2 text-[11px] font-semibold text-[#8ec0ff] disabled:opacity-40"
              >
                Apply refine
              </button>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setStage("compose")}
                className="rounded-xl border border-white/[0.12] px-5 py-3 text-[13px] text-[#b0b8c1]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => void handleBuildExperience()}
                className="flex-1 rounded-xl bg-[#4593fc] px-5 py-3 text-[13px] font-semibold text-white hover:bg-[#3a82e0]"
              >
                Build this Experience
              </button>
            </div>
          </>
        ) : null}

        {stage === "building" ? (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6b7684]">
              Building your Experience
            </p>
            <p className="mt-2 text-[32px] font-bold tabular-nums text-[#8ec0ff]">{buildPercent}%</p>
            <ul className="mt-4 space-y-1.5 text-[13px]">
              {buildSteps.map((step) => (
                <li
                  key={step.id}
                  className={
                    step.status === "done"
                      ? "text-emerald-400"
                      : step.status === "error"
                        ? "text-red-400"
                        : "text-[#6b7684]"
                  }
                >
                  {step.status === "done" ? "✓" : step.status === "error" ? "✕" : "○"} {step.label}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {error ? <p className="mt-4 text-center text-[12px] text-red-400">{error}</p> : null}
      </main>
    </div>
  );
}

function BlueprintList({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#151820] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6b7684]">{title}</p>
      <ul className="mt-2 space-y-0.5 font-mono text-[11px] text-[#b0b8c1]">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
