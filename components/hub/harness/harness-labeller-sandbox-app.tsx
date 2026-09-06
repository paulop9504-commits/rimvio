"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Harness, HarnessActionType } from "@/lib/rimvio-protocol/harness/schema";
import {
  LABELLING_ACTION_PALETTE,
  RESEARCH_NODE_ID,
  appendLabellingAction,
  applySandboxSurface,
  canAdvanceLabellingStep,
  createSandboxLabellingDraft,
  hasLabellingActions,
  removeLabellingAction,
  runtimeTypeToSurface,
  setExtractFields,
  setLabellingExceptionStrategy,
  setLabellingVerifications,
  updateLabellingOverview,
  type HarnessLabellingStepId,
  type HarnessSandboxSurface,
} from "@/lib/harness/labelling";
import { serializeHarness, validateHarness } from "@/lib/harness/validate";
import { HarnessRuntimeSurfacePicker } from "@/components/hub/harness/harness-runtime-surface-picker";
import { HarnessLabellingStepNav } from "@/components/hub/harness/harness-labelling-step-nav";
import { SaveHarnessToAccountButton } from "@/components/hub/harness/save-harness-to-account-button";

const STORAGE_KEY = "rimvio.hub.harness.labeller.v1";

type Persisted = {
  phase: "pick_runtime" | "labelling";
  step: HarnessLabellingStepId;
  completedThrough: number;
  harness: Harness;
};

function loadPersisted(): Persisted | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Persisted;
  } catch {
    return null;
  }
}

export function HarnessLabellerSandboxApp() {
  const [hydrated, setHydrated] = useState(false);
  const [phase, setPhase] = useState<"pick_runtime" | "labelling">("pick_runtime");
  const [surface, setSurface] = useState<HarnessSandboxSurface | null>(null);
  const [step, setStep] = useState<HarnessLabellingStepId>(1);
  const [completedThrough, setCompletedThrough] = useState(0);
  const [harness, setHarness] = useState<Harness | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  // draft fields
  const [name, setName] = useState("쇼핑몰 상품 검색");
  const [description, setDescription] = useState("");
  const [targetHost, setTargetHost] = useState("www.coupang.com");
  const [actionType, setActionType] = useState<HarnessActionType>("CLICK");
  const [selector, setSelector] = useState("");
  const [actionInput, setActionInput] = useState("{{keyword}}");
  const [extractName, setExtractName] = useState("name");
  const [extractSelector, setExtractSelector] = useState(".name");
  const [verifySelector, setVerifySelector] = useState(".search-product");
  const [keywordVar, setKeywordVar] = useState("노트북");
  const [runBusy, setRunBusy] = useState(false);
  const [runResult, setRunResult] = useState<{
    ok: boolean;
    runtimeKind: string;
    error: string | null;
    message?: string | null;
    taskId?: string | null;
    logs: Array<{ actionId: string; status: string; error?: { message: string } }>;
    screenshotDataUrl: string | null;
  } | null>(null);

  useEffect(() => {
    const saved = loadPersisted();
    if (saved?.harness) {
      setPhase(saved.phase);
      setStep(saved.step);
      setCompletedThrough(saved.completedThrough);
      setHarness(saved.harness);
      setSurface(runtimeTypeToSurface(saved.harness.runtime.type));
      setName(saved.harness.name);
      setDescription(saved.harness.description);
      setTargetHost(saved.harness.metadata?.targetHost ?? "");
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !harness) return;
    const payload: Persisted = { phase, step, completedThrough, harness };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [hydrated, phase, step, completedThrough, harness]);

  const researchActions = useMemo(
    () => harness?.nodes.find((n) => n.id === RESEARCH_NODE_ID)?.actions ?? [],
    [harness],
  );

  const startWithSurface = useCallback((next: HarnessSandboxSurface) => {
    if (harness && hasLabellingActions(harness) && runtimeTypeToSurface(harness.runtime.type) !== next) {
      const ok = window.confirm(
        "Runtime을 바꾸면 기존 액션 라벨이 초기화됩니다. 계속할까요?",
      );
      if (!ok) return;
    }
    const draft =
      harness && runtimeTypeToSurface(harness.runtime.type) === next
        ? harness
        : harness
          ? applySandboxSurface(harness, next, { resetActions: true })
          : createSandboxLabellingDraft({ name, surface: next });
    setSurface(next);
    setHarness(draft);
    setPhase("labelling");
    setStep(1);
    setCompletedThrough(0);
    setBanner(null);
  }, [harness, name]);

  const patchHarness = useCallback((updater: (h: Harness) => Harness) => {
    setHarness((prev) => (prev ? updater(prev) : prev));
  }, []);

  const runSandbox = async () => {
    if (!harness) return;
    const draft = updateLabellingOverview(harness, { name, description, targetHost });
    const checked = validateHarness(draft);
    if (!checked.ok) {
      setBanner(checked.issues.map((i) => i.message).join(" · "));
      return;
    }
    setRunBusy(true);
    setRunResult(null);
    setBanner(null);
    try {
      const res = await fetch("/api/hub/harness/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          harness: checked.harness,
          variables: { keyword: keywordVar },
          mode: surface === "local" ? "local" : "browser",
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        runtimeKind?: string;
        error?: string | null;
        message?: string | null;
        taskId?: string | null;
        screenshotDataUrl?: string | null;
        state?: { logs?: Array<{ actionId: string; status: string; error?: { message: string } }> };
      };
      setRunResult({
        ok: json.ok,
        runtimeKind: json.runtimeKind ?? "unknown",
        error: json.error ?? null,
        message: json.message ?? null,
        taskId: json.taskId ?? null,
        logs: json.state?.logs ?? [],
        screenshotDataUrl: json.screenshotDataUrl ?? null,
      });
      setBanner(
        json.ok
          ? json.message ?? `실행 성공 (${json.runtimeKind})`
          : json.message ?? `실행 실패: ${json.error ?? res.status}`,
      );
    } catch (err) {
      setBanner(err instanceof Error ? err.message : String(err));
    } finally {
      setRunBusy(false);
    }
  };

  const goNext = () => {
    if (!harness) return;
    let working = harness;
    if (step === 1) {
      working = updateLabellingOverview(harness, {
        name,
        description,
        targetHost,
        keywordField: true,
      });
      setHarness(working);
    }
    const gate = canAdvanceLabellingStep(working, step);
    if (!gate.ok) {
      setBanner(gate.issues.map((i) => i.message).join(" · "));
      return;
    }
    setBanner(null);
    if (step < 6) {
      setCompletedThrough((c) => Math.max(c, step));
      setStep((s) => (s + 1) as HarnessLabellingStepId);
    } else {
      const final = validateHarness(
        updateLabellingOverview(working, { name, description, targetHost }),
      );
      if (!final.ok) {
        setBanner(final.issues.map((i) => `${i.path}: ${i.message}`).join(" · "));
        return;
      }
      setHarness(final.harness);
      setCompletedThrough(6);
      setBanner("검증 통과 · draft Harness가 저장되었습니다 (localStorage).");
    }
  };

  const addAction = () => {
    if (!harness) return;
    if (!selector.trim() && actionType !== "WAIT" && actionType !== "OBSERVE") {
      setBanner("selector 또는 URL target이 필요합니다.");
      return;
    }
    patchHarness((h) =>
      appendLabellingAction(h, {
        type: actionType,
        target:
          actionType === "GET" || actionType === "NAVIGATE"
            ? { url: selector.startsWith("http") ? selector : `https://${selector || targetHost}` }
            : { selector: selector.trim() },
        input: actionType === "TYPE" ? actionInput : undefined,
        variable: actionType === "TYPE" ? "keyword" : undefined,
        waitFor:
          actionType === "WAIT"
            ? { type: "ELEMENT_EXISTS", selector: selector.trim() || verifySelector }
            : undefined,
        timeout: actionType === "WAIT" ? 15000 : undefined,
      }),
    );
    setBanner(null);
    setSelector("");
  };

  const addExtractField = () => {
    if (!harness || !extractName.trim() || !extractSelector.trim()) return;
    const existing =
      harness.nodes.find((n) => n.id === "n_extract")?.actions.find((a) => a.type === "EXTRACT")
        ?.fields ?? [];
    patchHarness((h) =>
      setExtractFields(h, [
        ...existing,
        { name: extractName.trim(), selector: extractSelector.trim(), type: "string" },
      ]),
    );
  };

  const addVerification = () => {
    if (!verifySelector.trim()) return;
    patchHarness((h) =>
      setLabellingVerifications(h, [
        ...h.verification,
        {
          id: `v_${h.verification.length + 1}`,
          type: "ELEMENT_EXISTS",
          target: { selector: verifySelector.trim() },
          severity: "blocker",
        },
      ]),
    );
  };

  if (!hydrated) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-[#64748B]">
        Loading labeller…
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#F8FAFC] text-[#0F172A]">
      <header className="flex items-center justify-between border-b border-[#E2E8F0] bg-white px-4 py-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] text-[#94A3B8]">
            <Link href="/hub" className="hover:text-[#6366F1]">
              Hub
            </Link>
            <span>/</span>
            <span>Harness Labeller</span>
            <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 font-semibold text-[#6366F1]">
              sandbox
            </span>
          </div>
          <h1 className="text-[16px] font-semibold tracking-tight">순차 라벨링</h1>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {surface ? (
            <button
              type="button"
              className="rounded-full border border-[#E2E8F0] px-3 py-1.5 text-[11px] font-semibold text-[#64748B]"
              onClick={() => setPhase("pick_runtime")}
            >
              Runtime: {surface === "web" ? "Web" : "Local"}
            </button>
          ) : null}
          {harness ? (
            <SaveHarnessToAccountButton
              harness={harness}
              onSaved={setBanner}
              onError={setBanner}
            />
          ) : null}
          <Link
            href="/hub/harness/library"
            className="rounded-full border border-[#E2E8F0] px-3 py-1.5 text-[11px] font-semibold"
          >
            내 라이브러리
          </Link>
          <Link
            href="/hub/workspace"
            className="rounded-full bg-[#0F172A] px-3 py-1.5 text-[11px] font-semibold text-white"
          >
            Dev Agent
          </Link>
        </div>
      </header>

      {phase === "pick_runtime" || !harness || !surface ? (
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-4 py-10">
          <div>
            <h2 className="text-[20px] font-semibold">Sandbox Runtime 선택</h2>
            <p className="mt-1 text-[13px] text-[#64748B]">
              Hub sandbox 안에서 Web 또는 Local을 고른 뒤, 같은 Harness에 순차적으로 행동을
              라벨링합니다. 실행은 하지 않고 Action Specification만 만듭니다.
            </p>
          </div>
          <label className="block text-[12px] font-semibold text-[#475569]">
            Harness 이름
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-[13px]"
            />
          </label>
          <HarnessRuntimeSurfacePicker value={surface} onChange={startWithSurface} />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <HarnessLabellingStepNav
            currentStep={step}
            completedThrough={completedThrough}
            onStepClick={(s) => {
              if (s <= completedThrough + 1) setStep(s);
            }}
          />
          <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
            {banner ? (
              <div className="rounded-xl border border-[#C7D2FE] bg-[#EEF2FF] px-3 py-2 text-[12px] text-[#3730A3]">
                {banner}
              </div>
            ) : null}

            {step === 1 ? (
              <section className="space-y-3 rounded-2xl border border-[#E2E8F0] bg-white p-4">
                <h2 className="text-[14px] font-semibold">1. 작업 개요</h2>
                <label className="block text-[12px] font-medium">
                  이름
                  <input
                    className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label className="block text-[12px] font-medium">
                  목적
                  <textarea
                    className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </label>
                <label className="block text-[12px] font-medium">
                  대상 ({surface === "web" ? "사이트 호스트" : "앱/윈도우 식별자"})
                  <input
                    className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2"
                    value={targetHost}
                    onChange={(e) => setTargetHost(e.target.value)}
                    placeholder={surface === "web" ? "www.example.com" : "AppId 또는 창 제목"}
                  />
                </label>
              </section>
            ) : null}

            {step === 2 ? (
              <section className="space-y-3 rounded-2xl border border-[#E2E8F0] bg-white p-4">
                <h2 className="text-[14px] font-semibold">2. 액션 라벨링 (순차)</h2>
                <ol className="space-y-2">
                  {researchActions.map((a, idx) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between rounded-xl bg-[#F8FAFC] px-3 py-2 text-[12px]"
                    >
                      <span>
                        <span className="mr-2 font-bold text-[#94A3B8]">{idx + 1}</span>
                        <span className="font-semibold text-[#6366F1]">{a.type}</span>{" "}
                        {a.target?.selector || a.target?.url || a.waitFor?.selector || "—"}
                      </span>
                      <button
                        type="button"
                        className="text-[11px] font-semibold text-[#EF4444]"
                        onClick={() => patchHarness((h) => removeLabellingAction(h, a.id))}
                      >
                        삭제
                      </button>
                    </li>
                  ))}
                  {researchActions.length === 0 ? (
                    <p className="text-[12px] text-[#94A3B8]">아직 액션이 없습니다. 아래에서 추가하세요.</p>
                  ) : null}
                </ol>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="text-[12px] font-medium">
                    Action
                    <select
                      className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2"
                      value={actionType}
                      onChange={(e) => setActionType(e.target.value as HarnessActionType)}
                    >
                      {LABELLING_ACTION_PALETTE.filter(
                        (p) => !(p.webOnly && surface === "local"),
                      ).map((p) => (
                        <option key={p.type} value={p.type}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-[12px] font-medium">
                    selector / URL
                    <input
                      className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2"
                      value={selector}
                      onChange={(e) => setSelector(e.target.value)}
                      placeholder={surface === "web" ? "#search" : "window:Main"}
                    />
                  </label>
                  {actionType === "TYPE" ? (
                    <label className="text-[12px] font-medium sm:col-span-2">
                      input
                      <input
                        className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2"
                        value={actionInput}
                        onChange={(e) => setActionInput(e.target.value)}
                      />
                    </label>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={addAction}
                  className="rounded-xl bg-[#6366F1] px-4 py-2 text-[12px] font-semibold text-white"
                >
                  액션 추가
                </button>
              </section>
            ) : null}

            {step === 3 ? (
              <section className="space-y-3 rounded-2xl border border-[#E2E8F0] bg-white p-4">
                <h2 className="text-[14px] font-semibold">3. 데이터 추출</h2>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-[12px]"
                    placeholder="field name"
                    value={extractName}
                    onChange={(e) => setExtractName(e.target.value)}
                  />
                  <input
                    className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-[12px]"
                    placeholder="selector"
                    value={extractSelector}
                    onChange={(e) => setExtractSelector(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={addExtractField}
                  className="rounded-xl bg-[#6366F1] px-4 py-2 text-[12px] font-semibold text-white"
                >
                  필드 추가
                </button>
                <ul className="text-[12px] text-[#475569]">
                  {(
                    harness.nodes.find((n) => n.id === "n_extract")?.actions.find((a) => a.type === "EXTRACT")
                      ?.fields ?? []
                  ).map((f) => (
                    <li key={f.name}>
                      {f.name} → {f.selector} ({f.type})
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {step === 4 ? (
              <section className="space-y-3 rounded-2xl border border-[#E2E8F0] bg-white p-4">
                <h2 className="text-[14px] font-semibold">4. 검증 규칙</h2>
                <input
                  className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-[12px]"
                  placeholder="성공 시 존재해야 할 selector"
                  value={verifySelector}
                  onChange={(e) => setVerifySelector(e.target.value)}
                />
                <button
                  type="button"
                  onClick={addVerification}
                  className="rounded-xl bg-[#6366F1] px-4 py-2 text-[12px] font-semibold text-white"
                >
                  ELEMENT_EXISTS 추가
                </button>
                <ul className="text-[12px]">
                  {harness.verification.map((v) => (
                    <li key={v.id}>
                      {v.type} {v.target?.selector}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {step === 5 ? (
              <section className="space-y-3 rounded-2xl border border-[#E2E8F0] bg-white p-4">
                <h2 className="text-[14px] font-semibold">5. 예외 처리</h2>
                <div className="flex flex-wrap gap-2">
                  {(["fail", "retry", "skip"] as const).map((strategy) => (
                    <button
                      key={strategy}
                      type="button"
                      className="rounded-full border border-[#E2E8F0] px-3 py-1.5 text-[12px] font-semibold capitalize"
                      onClick={() =>
                        patchHarness((h) =>
                          setLabellingExceptionStrategy(h, {
                            strategy,
                            ...(strategy === "retry" ? {} : {}),
                          }),
                        )
                      }
                    >
                      {strategy}
                    </button>
                  ))}
                </div>
                <p className="text-[12px] text-[#64748B]">
                  현재:{" "}
                  {harness.nodes.find((n) => n.id === RESEARCH_NODE_ID)?.onError?.strategy ?? "fail"}
                </p>
              </section>
            ) : null}

            {step === 6 ? (
              <section className="space-y-3 rounded-2xl border border-[#E2E8F0] bg-white p-4">
                <h2 className="text-[14px] font-semibold">6. 요약 · 샌드박스 실행</h2>
                <p className="text-[12px] text-[#64748B]">
                  Runtime <strong>{harness.runtime.type}</strong> · env{" "}
                  <strong>{harness.runtime.environment}</strong> · actions{" "}
                  <strong>{researchActions.length}</strong>
                </p>
                <label className="block text-[12px] font-medium">
                  실행 변수 keyword
                  <input
                    className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2"
                    value={keywordVar}
                    onChange={(e) => setKeywordVar(e.target.value)}
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={runBusy}
                    onClick={() => void runSandbox()}
                    className="rounded-xl bg-[#0F172A] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
                  >
                    {runBusy ? "실행 중…" : surface === "web" ? "Browser Sandbox 실행" : "Local Agent에 디스패치"}
                  </button>
                </div>
                {runResult ? (
                  <div className="space-y-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                    <p className="text-[12px] font-semibold">
                      {runResult.ok ? "SUCCESS" : "FAILED"} · {runResult.runtimeKind}
                      {runResult.taskId ? ` · task ${runResult.taskId}` : ""}
                    </p>
                    {runResult.message ? (
                      <p className="text-[11px] text-[#475569]">{runResult.message}</p>
                    ) : null}
                    <ul className="max-h-40 space-y-1 overflow-auto text-[11px] text-[#475569]">
                      {runResult.logs.map((log, idx) => (
                        <li key={`${log.actionId}-${idx}`}>
                          {log.status} · {log.actionId}
                          {log.error?.message ? ` — ${log.error.message}` : ""}
                        </li>
                      ))}
                    </ul>
                    {runResult.screenshotDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={runResult.screenshotDataUrl}
                        alt="sandbox screenshot"
                        className="max-h-56 w-full rounded-lg border border-[#E2E8F0] object-contain"
                      />
                    ) : null}
                  </div>
                ) : null}
                <pre className="max-h-[280px] overflow-auto rounded-xl bg-[#0F172A] p-3 text-[10px] leading-relaxed text-[#E2E8F0]">
                  {(() => {
                    const draft = updateLabellingOverview(harness, {
                      name,
                      description,
                      targetHost,
                    });
                    const checked = validateHarness(draft);
                    if (!checked.ok) {
                      return JSON.stringify(
                        { issues: checked.issues, draft },
                        null,
                        2,
                      );
                    }
                    return serializeHarness(checked.harness);
                  })()}
                </pre>
              </section>
            ) : null}

            <div className="flex justify-between pt-2">
              <button
                type="button"
                className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-2 text-[12px] font-semibold"
                onClick={() => setStep((s) => Math.max(1, s - 1) as HarnessLabellingStepId)}
                disabled={step === 1}
              >
                이전
              </button>
              <button
                type="button"
                className="rounded-xl bg-[#6366F1] px-4 py-2 text-[12px] font-semibold text-white"
                onClick={goNext}
              >
                {step === 6 ? "검증 · 저장" : "다음 단계"}
              </button>
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
