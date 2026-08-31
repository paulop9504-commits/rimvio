"use client";

import { ArrowUp, AtSign, ChevronDown, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { CHAT_SUGGESTIONS } from "@/lib/dev/rimvio-dev-agent/fixtures";
import type { DevAgentRuntime } from "@/lib/dev/rimvio-dev-agent/use-dev-agent-runtime";
import { Panel } from "./dev-agent-primitives";

const NEXT_STEPS = [
  "인증 및 테스트 실행",
  "Agent Invoke Test",
  "Publish to Rimvio Hub",
] as const;

export function DevAgentChatPanel({ runtime }: { runtime: DevAgentRuntime }) {
  const [stepsOpen, setStepsOpen] = useState(true);

  return (
    <aside
      className="flex w-[320px] shrink-0 flex-col border-l bg-[#fbfbfd]"
      style={{ borderColor: "rgba(0,0,0,0.06)" }}
    >
      <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
        <div>
          <p className="text-[14px] font-semibold">Agent Chat</p>
          <p className="text-[11px] text-[#86868b]">AI</p>
        </div>
        <button type="button" className="rounded-lg p-1.5 text-[#86868b] hover:bg-black/[0.04]">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {runtime.chatMessages.map((message) => (
          <div key={message.id} className={message.role === "user" ? "text-right" : ""}>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#86868b]">
              {message.role === "user" ? "You" : "Rimvio Agent"}
            </p>
            <div
              className={
                message.role === "user"
                  ? "ml-auto inline-block max-w-[92%] rounded-[14px] rounded-tr-md bg-[#6b4cff] px-3 py-2 text-left text-[13px] text-white"
                  : "max-w-[92%] rounded-[14px] rounded-tl-md border bg-white px-3 py-2 text-[13px] text-[#1d1d1f]"
              }
              style={message.role === "agent" ? { borderColor: "rgba(0,0,0,0.06)" } : undefined}
            >
              {message.text}
              {message.role === "agent" && message.checklist ? (
                <ul className="mt-2 space-y-1 text-[12px] text-[#636366]">
                  {message.checklist.map((item) => (
                    <li key={item.label}>
                      {item.done ? "✓" : "○"} {item.label}
                    </li>
                  ))}
                </ul>
              ) : null}
              {message.role === "agent" && message.summary ? (
                <Panel className="mt-3 p-3">
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div>
                      <p className="text-[22px] font-semibold">{message.summary.capabilities}</p>
                      <p className="text-[11px] text-[#86868b]">capabilities discovered</p>
                    </div>
                    <div>
                      <p className="text-[22px] font-semibold text-[#ff9500]">{message.summary.approvals}</p>
                      <p className="text-[11px] text-[#86868b]">require approval</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => runtime.setCenterMode({ kind: "sandbox" })}
                    className="mt-3 w-full rounded-[10px] border px-3 py-2 text-[12px] font-medium hover:border-[#6b4cff]/30"
                    style={{ borderColor: "rgba(0,0,0,0.08)" }}
                  >
                    Blueprint 보기
                  </button>
                </Panel>
              ) : null}
            </div>
          </div>
        ))}

        {runtime.isRunning ? (
          <div className="rounded-[12px] border border-[#6b4cff]/20 bg-[#f7f5ff] px-3 py-2">
            <div className="flex items-center gap-2 text-[12px] font-medium text-[#6b4cff]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#6b4cff]" />
              ● Executing in Sandbox…
            </div>
            {runtime.activeCapabilityId ? (
              <p className="mt-1 text-[11px] text-[#86868b]">
                Capability: {runtime.activeCapabilityId}
              </p>
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setStepsOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-[10px] border bg-white px-3 py-2 text-[12px] font-medium text-[#636366]"
          style={{ borderColor: "rgba(0,0,0,0.08)" }}
        >
          Next Steps
          <ChevronDown className={`h-3.5 w-3.5 transition ${stepsOpen ? "rotate-180" : ""}`} />
        </button>
        {stepsOpen ? (
          <ul className="space-y-1 rounded-[10px] border bg-white p-2 text-[12px] text-[#636366]" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
            {NEXT_STEPS.map((step) => (
              <li key={step} className="rounded-md px-2 py-1.5 hover:bg-black/[0.03]">
                {step}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="border-t p-4" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {CHAT_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => runtime.setCommand(suggestion)}
              className="rounded-full border bg-white px-2.5 py-1 text-[11px] text-[#636366] hover:border-[#6b4cff]/30 hover:text-[#6b4cff]"
              style={{ borderColor: "rgba(0,0,0,0.08)" }}
            >
              {suggestion}
            </button>
          ))}
        </div>

        <div
          className="rounded-[16px] border bg-white p-3 shadow-[0_4px_20px_rgba(0,0,0,0.04)]"
          style={{ borderColor: "rgba(0,0,0,0.08)" }}
        >
          <textarea
            value={runtime.command}
            onChange={(e) => runtime.setCommand(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                runtime.sendCommand();
              }
            }}
            rows={3}
            placeholder="Agent에게 명령하세요…"
            className="w-full resize-none bg-transparent text-[13px] outline-none placeholder:text-[#aeaeb2]"
          />
          <div className="mt-2 flex items-center justify-between">
            <button
              type="button"
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-[#86868b] hover:bg-black/[0.04]"
            >
              <AtSign className="h-3.5 w-3.5" />
              Skill 사용
            </button>
            <button
              type="button"
              onClick={runtime.sendCommand}
              className="flex items-center gap-1 rounded-[10px] bg-[#6b4cff] px-3 py-1.5 text-[12px] font-semibold text-white"
            >
              <ArrowUp className="h-3.5 w-3.5" />
              Send
            </button>
          </div>
        </div>

        <p className="mt-2 flex items-center gap-1 text-[10px] text-[#aeaeb2]">
          <Sparkles className="h-3 w-3" />
          Chat 명령이 중앙 Sandbox에서 즉시 실행됩니다.
        </p>
      </div>
    </aside>
  );
}
