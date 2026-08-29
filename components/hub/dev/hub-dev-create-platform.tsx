"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Github, Link2, Upload, Sparkles } from "lucide-react";
import {
  analyzePlatformIngress,
  type PlatformIngressKind,
} from "@/lib/hub/dev/platform-analyzer";
import { HubDevBlueprintReview } from "@/components/hub/dev/hub-dev-blueprint-review";
import {
  metaFromDraft,
  setActivePlatformId,
  upsertPlatform,
} from "@/lib/hub/dev/platform-registry";
import { cn } from "@/lib/utils";

type IngressTab = PlatformIngressKind | "describe";

const INGRESS_TABS: { id: IngressTab; label: string }[] = [
  { id: "github", label: "GitHub" },
  { id: "api", label: "API 연결" },
  { id: "upload", label: "코드 업로드" },
  { id: "openapi", label: "OpenAPI" },
  { id: "mcp", label: "MCP" },
  { id: "describe", label: "직접 만들기" },
];

export function HubDevCreatePlatform() {
  const router = useRouter();
  const [tab, setTab] = useState<IngressTab>("github");
  const [value, setValue] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [blueprint, setBlueprint] = useState<Awaited<
    ReturnType<typeof analyzePlatformIngress>
  > | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = useCallback(async () => {
    setAnalyzing(true);
    setError(null);
    const result = await analyzePlatformIngress({
      kind: tab === "describe" ? "describe" : tab,
      value: value.trim(),
    });
    setAnalyzing(false);
    if (!result) {
      setError("분석할 수 없습니다. URL·설명을 확인해 주세요.");
      return;
    }
    setBlueprint(result);
  }, [tab, value]);

  const handleConfirmBlueprint = useCallback(() => {
    if (!blueprint) return;
    const meta = metaFromDraft(blueprint.draft, blueprint.ingressLabel, {
      status: "agent_ready",
      rimvioCertified: blueprint.certification.filter((c) => c.passed).length >= 6,
    });
    upsertPlatform({ meta, draft: blueprint.draft });
    setActivePlatformId(blueprint.draft.id);
    router.push(`/hub/workspace?platform=${encodeURIComponent(blueprint.draft.id)}&nav=overview`);
  }, [blueprint, router]);

  if (blueprint) {
    return (
      <HubDevBlueprintReview
        blueprint={blueprint}
        onBack={() => setBlueprint(null)}
        onConfirm={handleConfirmBlueprint}
        onTest={() => {
          handleConfirmBlueprint();
        }}
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
          ← My Platforms
        </Link>
      </header>

      <main className="mx-auto max-w-xl px-6 py-16">
        <p className="text-center text-[11px] font-semibold uppercase tracking-widest text-[#6b7684]">
          Create on Rimvio
        </p>
        <h1 className="mt-3 text-center text-[26px] font-bold tracking-tight">
          무엇을 올리려고 하나요?
        </h1>
        <p className="mt-2 text-center text-[13px] text-[#6b7684]">
          GitHub · API · OpenAPI · MCP — Rimvio가 Agent-ready Capability로 자동 변환합니다.
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
              <Github className="size-4 shrink-0" />
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
              <span>ZIP 또는 소스 폴더 선택 (MVP: 경로 입력)</span>
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
              placeholder="동네 중고거래 플랫폼 — 검색·등록·채팅·결제까지"
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
              onClick={() => void handleAnalyze()}
              className="flex min-w-[200px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#4593fc] to-[#6366f1] px-6 py-2.5 text-[14px] font-semibold text-white hover:opacity-95 disabled:opacity-40"
            >
              <Sparkles className="size-4" />
              {analyzing ? "Analyzing…" : "Analyze"}
            </button>
          </div>
        </div>

        {error ? <p className="mt-4 text-center text-[12px] text-red-400">{error}</p> : null}

        <p className="mt-8 text-center text-[11px] text-[#6b7684]">
          Capability · Schema · Permission · Runtime — Rimvio가 자동 생성합니다. Dev는 확인만.
        </p>
      </main>
    </div>
  );
}
