"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Harness, HarnessNodeType } from "@/lib/rimvio-protocol/harness/schema";
import { buildSampleShoppingSearchHarness } from "@/lib/harness/fixtures";
import { validateHarness, serializeHarness, requiresApproval } from "@/lib/harness/validate";
import {
  HARNESS_BUILDER_STEPS,
  addHarnessBuilderNode,
  applyBuilderAssistantCommand,
  removeHarnessBuilderNode,
  updateHarnessNodeFields,
} from "@/lib/harness/builder-graph";
import { HarnessBuilderCanvas } from "@/components/hub/harness/harness-builder-canvas";
import { SaveHarnessToAccountButton } from "@/components/hub/harness/save-harness-to-account-button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "rimvio.hub.harness.builder.v1";
const LABELLER_KEY = "rimvio.hub.harness.labeller.v1";

const NODE_PALETTE: HarnessNodeType[] = [
  "TRIGGER",
  "RESEARCH",
  "EXTRACT",
  "ACTION",
  "CONDITION",
  "REPORT",
  "VERIFY",
];

export function HarnessBuilderApp() {
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState(3);
  const [harness, setHarness] = useState<Harness>(() => buildSampleShoppingSearchHarness());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantLog, setAssistantLog] = useState<string[]>([
    "샘플 Harness를 불러왔습니다. 노드를 추가하거나 명령을 입력하세요.",
  ]);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { harness: Harness; step?: number };
        if (parsed.harness?.id) {
          setHarness(parsed.harness);
          if (parsed.step) setStep(parsed.step);
        }
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ harness, step }));
  }, [hydrated, harness, step]);

  const selected = useMemo(
    () => harness.nodes.find((n) => n.id === selectedNodeId) ?? null,
    [harness.nodes, selectedNodeId],
  );

  const validation = useMemo(() => validateHarness(harness), [harness]);

  const runAssistant = () => {
    if (!assistantInput.trim()) return;
    // Full NL → new harness graph
    if (
      assistantInput.length > 20 ||
      /검색|비교|쿠팡|만들어|찾아|해줘/.test(assistantInput)
    ) {
      void (async () => {
        const res = await fetch("/api/hub/harness/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            utterance: assistantInput,
            surface: harness.runtime.type === "DESKTOP" ? "local" : "web",
          }),
        });
        const json = (await res.json()) as {
          ok: boolean;
          harness?: Harness;
          messages?: string[];
          issues?: string[];
        };
        if (json.ok && json.harness) {
          setHarness(json.harness);
          setAssistantLog((prev) => [
            `→ ${assistantInput}`,
            ...(json.messages ?? ["Harness 생성 완료"]),
            ...prev,
          ].slice(0, 12));
          setAssistantInput("");
          setStep(3);
          setBanner("NL Agent가 Harness 그래프를 생성했습니다.");
          return;
        }
        setAssistantLog((prev) => [
          `→ ${assistantInput}`,
          ...(json.issues ?? ["생성 실패"]),
          ...prev,
        ].slice(0, 12));
      })();
      return;
    }
    const result = applyBuilderAssistantCommand(harness, assistantInput);
    setHarness(result.harness);
    setAssistantLog((prev) => [`→ ${assistantInput}`, result.message, ...prev].slice(0, 12));
    setAssistantInput("");
  };

  const importLabeller = () => {
    try {
      const raw = window.localStorage.getItem(LABELLER_KEY);
      if (!raw) {
        setBanner("Labeller draft가 없습니다. /hub/harness/labeller 에서 먼저 만드세요.");
        return;
      }
      const parsed = JSON.parse(raw) as { harness?: Harness };
      if (!parsed.harness) {
        setBanner("Labeller draft 형식이 올바르지 않습니다.");
        return;
      }
      setHarness(parsed.harness);
      setBanner("Labeller draft를 Builder로 가져왔습니다.");
      setStep(3);
    } catch {
      setBanner("Labeller draft를 읽지 못했습니다.");
    }
  };

  const markTesting = () => {
    const checked = validateHarness(harness);
    if (!checked.ok) {
      setBanner(checked.issues.map((i) => i.message).join(" · "));
      return;
    }
    setHarness({ ...checked.harness, status: "testing", updatedAt: new Date().toISOString() });
    setBanner("status → testing (Publish/Registry는 이후 Phase).");
    setStep(7);
  };

  if (!hydrated) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-[#64748B]">
        Loading builder…
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#F8FAFC] text-[#0F172A]">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] bg-white px-4 py-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] text-[#94A3B8]">
            <Link href="/hub/harness" className="hover:text-[#6366F1]">
              Harness
            </Link>
            <span>/</span>
            <span>Builder</span>
          </div>
          <h1 className="text-[16px] font-semibold">{harness.name}</h1>
          <p className="text-[11px] text-[#64748B]">
            {harness.runtime.type} · {harness.status} · v{harness.version}
            {requiresApproval(harness) ? " · approval required" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={importLabeller}
            className="rounded-full border border-[#E2E8F0] px-3 py-1.5 text-[11px] font-semibold"
          >
            Labeller에서 가져오기
          </button>
          <SaveHarnessToAccountButton
            harness={harness}
            onSaved={setBanner}
            onError={setBanner}
          />
          <Link
            href="/hub/harness/library"
            className="rounded-full border border-[#E2E8F0] px-3 py-1.5 text-[11px] font-semibold"
          >
            내 라이브러리
          </Link>
          <button
            type="button"
            onClick={() => setHarness(buildSampleShoppingSearchHarness())}
            className="rounded-full border border-[#E2E8F0] px-3 py-1.5 text-[11px] font-semibold"
          >
            샘플 로드
          </button>
          <Link
            href="/hub/harness/labeller"
            className="rounded-full bg-[#0F172A] px-3 py-1.5 text-[11px] font-semibold text-white"
          >
            Labeller
          </Link>
        </div>
      </header>

      {banner ? (
        <div className="border-b border-[#C7D2FE] bg-[#EEF2FF] px-4 py-2 text-[12px] text-[#3730A3]">
          {banner}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <nav className="flex gap-1 overflow-x-auto border-b border-[#E2E8F0] bg-[#FAFBFC] p-2 lg:w-[200px] lg:shrink-0 lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:border-r">
          {HARNESS_BUILDER_STEPS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStep(s.id)}
              className={cn(
                "shrink-0 rounded-xl px-2.5 py-2 text-left",
                step === s.id ? "bg-white shadow-sm ring-1 ring-[#E2E8F0]" : "hover:bg-white/70",
              )}
            >
              <span className="text-[11px] font-semibold">
                {s.id}. {s.title}
              </span>
              <span className="block text-[10px] text-[#94A3B8]">{s.description}</span>
            </button>
          ))}
        </nav>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap gap-2 border-b border-[#E2E8F0] bg-white px-3 py-2">
            {NODE_PALETTE.map((type) => (
              <button
                key={type}
                type="button"
                className="rounded-lg border border-[#E2E8F0] px-2 py-1 text-[10px] font-bold text-[#475569]"
                onClick={() => setHarness((h) => addHarnessBuilderNode(h, type))}
              >
                + {type}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 p-3">
            {(step === 1 || step === 2) && (
              <div className="mx-auto max-w-xl space-y-3 rounded-2xl border border-[#E2E8F0] bg-white p-4">
                <label className="block text-[12px] font-semibold">
                  이름
                  <input
                    className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2"
                    value={harness.name}
                    onChange={(e) =>
                      setHarness((h) => ({ ...h, name: e.target.value, updatedAt: new Date().toISOString() }))
                    }
                  />
                </label>
                <label className="block text-[12px] font-semibold">
                  설명 / 전문 지식
                  <textarea
                    className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2"
                    rows={5}
                    value={harness.description}
                    onChange={(e) =>
                      setHarness((h) => ({
                        ...h,
                        description: e.target.value,
                        updatedAt: new Date().toISOString(),
                      }))
                    }
                  />
                </label>
              </div>
            )}

            {step === 3 || step === 4 || step === 5 ? (
              <HarnessBuilderCanvas
                harness={harness}
                selectedNodeId={selectedNodeId}
                onSelectNode={setSelectedNodeId}
                onChangeHarness={setHarness}
              />
            ) : null}

            {step === 6 ? (
              <div className="mx-auto max-w-2xl space-y-3 rounded-2xl border border-[#E2E8F0] bg-white p-4">
                <h2 className="text-[14px] font-semibold">스키마 테스트</h2>
                {validation.ok ? (
                  <p className="text-[13px] text-[#16A34A]">validateHarness: PASS</p>
                ) : (
                  <ul className="text-[12px] text-[#DC2626]">
                    {validation.issues.map((i) => (
                      <li key={`${i.path}-${i.code}`}>
                        {i.path}: {i.message}
                      </li>
                    ))}
                  </ul>
                )}
                <pre className="max-h-80 overflow-auto rounded-xl bg-[#0F172A] p-3 text-[10px] text-[#E2E8F0]">
                  {validation.ok ? serializeHarness(validation.harness) : JSON.stringify(harness, null, 2)}
                </pre>
              </div>
            ) : null}

            {step === 7 ? (
              <div className="mx-auto max-w-lg space-y-3 rounded-2xl border border-[#E2E8F0] bg-white p-4">
                <h2 className="text-[14px] font-semibold">배포 준비</h2>
                <p className="text-[12px] text-[#64748B]">
                  개인 계정에 저장하면 다른 사용자와 격리됩니다. Marketplace 공개는 이후 Phase.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={markTesting}
                    className="rounded-xl border border-[#E2E8F0] px-4 py-2 text-[12px] font-semibold"
                  >
                    testing으로 표시
                  </button>
                  <SaveHarnessToAccountButton
                    harness={harness}
                    status="published"
                    visibility="private"
                    label="내 계정에 게시 (비공개)"
                    onSaved={setBanner}
                    onError={setBanner}
                    className="rounded-xl bg-[#6366F1] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
                  />
                </div>
              </div>
            ) : null}
          </div>

          {(step === 3 || step === 4 || step === 5) && selected ? (
            <div className="border-t border-[#E2E8F0] bg-white px-4 py-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[12px] font-semibold">
                  선택 노드 · {selected.type} / {selected.id}
                </h3>
                <button
                  type="button"
                  className="text-[11px] font-semibold text-[#EF4444]"
                  onClick={() => {
                    setHarness((h) => removeHarnessBuilderNode(h, selected.id));
                    setSelectedNodeId(null);
                  }}
                >
                  삭제
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-[12px]"
                  value={selected.name}
                  onChange={(e) =>
                    setHarness((h) => updateHarnessNodeFields(h, selected.id, { name: e.target.value }))
                  }
                />
                <input
                  className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-[12px]"
                  value={selected.description ?? ""}
                  placeholder="description"
                  onChange={(e) =>
                    setHarness((h) =>
                      updateHarnessNodeFields(h, selected.id, { description: e.target.value }),
                    )
                  }
                />
              </div>
              {step === 4 ? (
                <p className="mt-2 text-[11px] text-[#64748B]">
                  permissions {selected.permissions.length} · constraints {selected.constraints.length} ·
                  root constraints {harness.constraints.length}
                </p>
              ) : null}
              {step === 5 ? (
                <p className="mt-2 text-[11px] text-[#64748B]">
                  node verification {selected.verification.length} · root {harness.verification.length}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <aside className="flex w-full flex-col border-t border-[#E2E8F0] bg-white lg:w-[280px] lg:border-l lg:border-t-0">
          <div className="border-b border-[#E2E8F0] px-3 py-2 text-[12px] font-semibold">AI Assistant</div>
          <div className="flex-1 space-y-2 overflow-auto p-3 text-[11px] text-[#475569]">
            {assistantLog.map((line, i) => (
              <p key={`${i}-${line.slice(0, 12)}`} className="rounded-lg bg-[#F8FAFC] px-2 py-1.5">
                {line}
              </p>
            ))}
          </div>
          <div className="border-t border-[#E2E8F0] p-3">
            <textarea
              className="w-full rounded-lg border border-[#E2E8F0] px-2 py-2 text-[12px]"
              rows={3}
              placeholder="긴 요청: 쿠팡에서 노트북 검색해줘 / 짧은 패치: 검증 단계 추가해줘"
              value={assistantInput}
              onChange={(e) => setAssistantInput(e.target.value)}
            />
            <button
              type="button"
              onClick={runAssistant}
              className="mt-2 w-full rounded-xl bg-[#6366F1] py-2 text-[12px] font-semibold text-white"
            >
              적용
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
