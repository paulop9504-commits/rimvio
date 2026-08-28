"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, CheckCircle2, Circle, Loader2, Send, Sparkles, XCircle } from "lucide-react";
import type { CapabilityDraft } from "@/lib/hub/capability/types";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import { DEPLOY_AGENT_TEMPLATES } from "@/lib/hub/deploy/hub-deploy-agent";
import {
  executeHubDeployTurn,
  planHubDeployTurn,
  type DeployExecutorCallbacks,
  type DeployWorkStep,
} from "@/lib/hub/deploy/hub-deploy-runtime";
import type { DeployAgentMessage, DeployAgentProposal } from "@/lib/hub/deploy/hub-deploy-agent";
import { cn } from "@/lib/utils";

const WELCOME_CAPABILITY =
  "배포 개발 Agent입니다. 아이디어를 말하면 manifest를 만들고, **배포해**라고 하면 테스트 후 Hub에 제출까지 진행합니다. (Cursor처럼 말 = 실행)";

const WELCOME_PLATFORM =
  "Platform 배포 Agent입니다. 서비스를 설명하면 Blueprint를 컴파일하고, **배포해**라고 하면 Runtime까지 등록합니다.";

type HubDeployAgentChatProps = {
  mode: "capability" | "platform";
  draft: CapabilityDraft | PlatformDraft;
  testsPassed: boolean;
  onApplyPatch: (patch: Partial<CapabilityDraft> | Partial<PlatformDraft>) => void;
  onSuggestedStep?: (step: number) => void;
  seedUtterance?: string | null;
  onSeedConsumed?: () => void;
  executor: DeployExecutorCallbacks;
};

function ProposalCard({
  proposal,
  onAccept,
}: {
  proposal: DeployAgentProposal;
  onAccept: () => void;
}) {
  return (
    <div className="mt-2 rounded-xl border border-[#4593fc]/25 bg-[#4593fc]/10 p-3">
      <p className="mb-1 text-[11px] font-semibold text-[#8ec0ff]">{proposal.title}</p>
      <p className="mb-2 text-[12px] font-medium text-[#f2f4f6]">{proposal.summaryKo}</p>
      <ul className="mb-3 space-y-1 text-[11px] text-[#b0b8c1]">
        {proposal.bullets.map((b) => (
          <li key={b} className="flex gap-1.5">
            <span className="text-[#4593fc]">·</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onAccept}
        className="rounded-lg bg-[#4593fc] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#3a82e0]"
      >
        좋아요, 적용!
      </button>
    </div>
  );
}

function WorkLogCard({ steps }: { steps: DeployWorkStep[] }) {
  if (steps.length === 0) return null;

  return (
    <div className="mt-2 space-y-1 rounded-xl border border-white/[0.08] bg-[#0c0e12] p-2.5">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#6b7684]">
        Agent 실행
      </p>
      {steps.map((step) => (
        <div key={step.id} className="flex items-start gap-2 text-[11px]">
          {step.status === "running" ? (
            <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin text-[#8ec0ff]" />
          ) : step.status === "success" ? (
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-400" />
          ) : step.status === "failed" ? (
            <XCircle className="mt-0.5 size-3.5 shrink-0 text-red-400" />
          ) : (
            <Circle className="mt-0.5 size-3.5 shrink-0 text-[#6b7684]" />
          )}
          <div className="min-w-0">
            <p
              className={cn(
                step.status === "failed" ? "text-red-300" : "text-[#b0b8c1]",
              )}
            >
              {step.labelKo}
            </p>
            {step.detail ? (
              <p className="truncate font-mono text-[10px] text-[#6b7684]">{step.detail}</p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

type ChatEntry =
  | { kind: "message"; message: DeployAgentMessage; pendingPatch?: boolean }
  | { kind: "work"; steps: DeployWorkStep[] };

export function HubDeployAgentChat({
  mode,
  draft,
  testsPassed,
  onApplyPatch,
  onSuggestedStep,
  seedUtterance,
  onSeedConsumed,
  executor,
}: HubDeployAgentChatProps) {
  const [input, setInput] = useState("");
  const [entries, setEntries] = useState<ChatEntry[]>([
    {
      kind: "message",
      message: {
        id: "welcome",
        role: "agent",
        content: mode === "capability" ? WELCOME_CAPABILITY : WELCOME_PLATFORM,
      },
    },
  ]);
  const [pendingPatch, setPendingPatch] = useState<
    Partial<CapabilityDraft> | Partial<PlatformDraft> | null
  >(null);
  const [running, setRunning] = useState(false);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || running) return;

      const plan = planHubDeployTurn(trimmed, {
        mode,
        draft: draftRef.current,
        testsPassed,
      });

      const userEntry: ChatEntry = {
        kind: "message",
        message: { id: `u_${Date.now()}`, role: "user", content: trimmed },
      };

      const agentMessages = plan.messages.filter((m) => m.role === "agent");
      const agentEntries: ChatEntry[] = agentMessages.map((m) => ({
        kind: "message" as const,
        message: m,
        pendingPatch: Boolean(m.structured && plan.patch && !plan.autoApplyPatch),
      }));

      setEntries((prev) => [...prev, userEntry, ...agentEntries]);

      if (plan.patch && !plan.autoApplyPatch) {
        setPendingPatch(plan.patch);
        const proposal = plan.proposal;
        if (proposal?.suggestedStep) onSuggestedStep?.(proposal.suggestedStep);
        setInput("");
        return;
      }

      if (plan.workSteps.length > 0) {
        setEntries((prev) => [
          ...prev,
          { kind: "work", steps: [...plan.workSteps] },
        ]);
        setRunning(true);

        let workIndex = -1;
        setEntries((prev) => {
          workIndex = prev.length - 1;
          return prev;
        });

        const onStepUpdate = (steps: DeployWorkStep[]) => {
          setEntries((prev) => {
            const next = [...prev];
            if (workIndex >= 0 && next[workIndex]?.kind === "work") {
              next[workIndex] = { kind: "work", steps: [...steps] };
            }
            return next;
          });
        };

        const result = await executeHubDeployTurn(plan, executor, onStepUpdate);

        if (result.publishResult?.success && result.publishResult.platformId) {
          setEntries((prev) => [
            ...prev,
            {
              kind: "message",
              message: {
                id: `done_${Date.now()}`,
                role: "agent",
                content: `배포 완료. Runtime이 등록되었습니다 → /platform/${result.publishResult!.platformId}`,
              },
            },
          ]);
        } else if (result.publishResult && !result.publishResult.success) {
          setEntries((prev) => [
            ...prev,
            {
              kind: "message",
              message: {
                id: `err_${Date.now()}`,
                role: "agent",
                content: result.publishResult!.error ?? "배포에 실패했습니다.",
              },
            },
          ]);
        } else if (plan.intent === "test" && result.workSteps.every((s) => s.status === "success")) {
          setEntries((prev) => [
            ...prev,
            {
              kind: "message",
              message: {
                id: `test_ok_${Date.now()}`,
                role: "agent",
                content: "테스트 통과. **배포해**라고 하면 제출까지 진행할 수 있습니다.",
              },
            },
          ]);
        } else if (plan.autoApplyPatch) {
          setEntries((prev) => [
            ...prev,
            {
              kind: "message",
              message: {
                id: `built_${Date.now()}`,
                role: "agent",
                content: "Workspace에 반영했습니다. manifest를 확인한 뒤 **배포해**라고 말해 주세요.",
              },
            },
          ]);
          if (plan.proposal?.suggestedStep) onSuggestedStep?.(plan.proposal.suggestedStep);
        }

        setRunning(false);
      }

      setInput("");
    },
    [executor, mode, onSuggestedStep, running, testsPassed],
  );

  useEffect(() => {
    if (seedUtterance) {
      void send(seedUtterance);
      onSeedConsumed?.();
    }
  }, [onSeedConsumed, seedUtterance, send]);

  const acceptProposal = useCallback(() => {
    if (pendingPatch) {
      onApplyPatch(pendingPatch);
      setPendingPatch(null);
      setEntries((prev) => [
        ...prev,
        {
          kind: "message",
          message: {
            id: `applied_${Date.now()}`,
            role: "agent",
            content: "Draft에 반영했습니다. **배포해**라고 하면 테스트 후 제출합니다.",
          },
        },
      ]);
    }
  }, [onApplyPatch, pendingPatch]);

  return (
    <div className="flex h-full min-h-0 flex-col border-r border-white/[0.06] bg-[#111318]">
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2.5">
        <div className="flex size-7 items-center justify-center rounded-lg bg-[#4593fc]/20">
          <Bot className="size-4 text-[#8ec0ff]" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-[#f2f4f6]">배포 개발 Agent</p>
          <p className="flex items-center gap-1 text-[10px] text-[#6b7684]">
            <Sparkles className="size-3 text-[#4593fc]" />
            Plan → Execute → Verify → Publish
          </p>
        </div>
        {running ? (
          <Loader2 className="size-4 animate-spin text-[#8ec0ff]" aria-label="실행 중" />
        ) : null}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 rimvio-scroll-touch">
        {entries.map((entry, i) => {
          if (entry.kind === "work") {
            return <WorkLogCard key={`work-${i}`} steps={entry.steps} />;
          }
          const m = entry.message;
          return (
            <div
              key={m.id}
              className={cn(
                "max-w-[95%] rounded-xl px-3 py-2 text-[12px] leading-relaxed",
                m.role === "user"
                  ? "ml-auto bg-[#4593fc] text-white"
                  : "bg-[#151820] text-[#b0b8c1]",
              )}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.structured ? (
                <ProposalCard proposal={m.structured} onAccept={acceptProposal} />
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="shrink-0 border-t border-white/[0.06] p-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            disabled={running}
            placeholder="예: 오사카 여행 capability 만들어 / 배포해"
            className="min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-[#1a1f28] px-3 py-2 text-[12px] text-[#f2f4f6] placeholder:text-[#6b7684] focus:border-[#4593fc]/50 focus:outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => void send(input)}
            disabled={running}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#4593fc] text-white hover:bg-[#3a82e0] disabled:opacity-50"
            aria-label="전송"
          >
            <Send className="size-4" />
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {DEPLOY_AGENT_TEMPLATES.slice(0, 3).map((t) => (
            <button
              key={t.label}
              type="button"
              disabled={running}
              onClick={() => void send(t.utterance)}
              className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] text-[#b0b8c1] hover:bg-white/[0.1] disabled:opacity-50"
            >
              {t.label}
            </button>
          ))}
          <button
            type="button"
            disabled={running}
            onClick={() => void send("배포해")}
            className="rounded-md bg-[#4593fc]/20 px-2 py-0.5 text-[10px] font-semibold text-[#8ec0ff] hover:bg-[#4593fc]/30 disabled:opacity-50"
          >
            배포해
          </button>
        </div>
      </div>
    </div>
  );
}
