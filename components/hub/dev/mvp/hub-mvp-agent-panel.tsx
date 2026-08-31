"use client";

import { ArrowUp, Sparkles } from "lucide-react";
import { Panel } from "@/components/dev/rimvio-dev-agent/dev-agent-primitives";
import type { HubMvpRuntime } from "@/lib/hub/dev/mvp/use-hub-mvp-runtime";

const SUGGESTIONS = [
  "쿠팡에서 상품을 검색하고 가격을 비교하는 능력을 만들어줘",
  "product.search 테스트해줘",
  "상품 가격 비교 능력 찾아줘",
] as const;

export function HubMvpAgentPanel({ runtime }: { runtime: HubMvpRuntime }) {
  return (
    <aside
      className="flex w-[320px] shrink-0 flex-col border-l bg-[#fbfbfd]"
      style={{ borderColor: "rgba(0,0,0,0.06)" }}
    >
      <div className="border-b px-4 py-3" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
        <p className="text-[14px] font-semibold">Dev Agent</p>
        <p className="text-[11px] text-[#86868b]">무엇을 할 수 있게 만들까요?</p>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {runtime.chatMessages.map((message) => (
          <div key={message.id} className={message.role === "user" ? "text-right" : ""}>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#86868b]">
              {message.role === "user" ? "You" : "Rimvio"}
            </p>
            <div
              className={
                message.role === "user"
                  ? "ml-auto inline-block max-w-[92%] rounded-[14px] rounded-tr-md bg-[#6b4cff] px-3 py-2 text-left text-[13px] text-white"
                  : "max-w-[92%] rounded-[14px] rounded-tl-md border bg-white px-3 py-2 text-[13px]"
              }
              style={message.role === "agent" ? { borderColor: "rgba(0,0,0,0.06)" } : undefined}
            >
              {message.text}
              {message.role === "agent" && message.workflow ? (
                <ul className="mt-2 space-y-1 text-[12px] text-[#636366]">
                  {message.workflow.map((row) => (
                    <li key={row.stage}>
                      {row.done ? "✓" : "○"} {row.label}
                    </li>
                  ))}
                </ul>
              ) : null}
              {message.role === "agent" && message.discovery?.length ? (
                <Panel className="mt-3 p-3">
                  <p className="text-[11px] font-semibold text-[#86868b]">Found</p>
                  {message.discovery.map((hit) => (
                    <div key={hit.name} className="mt-1 flex justify-between text-[12px]">
                      <span>{hit.name}</span>
                      <span className="text-[#6b4cff]">{hit.score}%</span>
                    </div>
                  ))}
                </Panel>
              ) : null}
            </div>
          </div>
        ))}

        {runtime.isRunning ? (
          <div className="flex items-center gap-2 text-[12px] text-[#6b4cff]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#6b4cff]" />
            Sandbox에서 실행 중…
          </div>
        ) : null}
      </div>

      <div className="border-t p-4" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((suggestion) => (
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
            placeholder="Rimvio에게 무엇을 가르칠까요?"
            className="w-full resize-none bg-transparent text-[13px] outline-none placeholder:text-[#aeaeb2]"
          />
          <div className="mt-2 flex justify-end">
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
          말하면 만들고, Sandbox에서 바로 확인합니다.
        </p>
      </div>
    </aside>
  );
}
