"use client";

import { useEffect, useRef } from "react";
import { AgentActionCards } from "@/components/experience-app/agent-action-cards";
import type { AgentActionCard, AgentChatTurn } from "@/lib/experience-app/surface-types";
import { cn } from "@/lib/utils";

export function AgentChatThread(props: {
  readonly turns: readonly AgentChatTurn[];
  readonly busy?: boolean;
  readonly onAction: (card: AgentActionCard) => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [props.turns.length, props.busy]);

  return (
    <div className="space-y-3 pb-2">
      {props.turns.length === 0 ? (
        <div className="rounded-2xl bg-white px-4 py-6 text-center shadow-sm">
          <p className="text-[15px] font-semibold text-[#111827]">무엇을 도와드릴까요?</p>
          <p className="mt-1 text-[12px] text-[#6b7280]">주문 · 배달 추적 · 매장 관리</p>
        </div>
      ) : null}
      {props.turns.map((turn) => (
        <div
          key={turn.id}
          className={cn(
            "max-w-[92%] rounded-2xl px-3 py-2.5 text-[13px] leading-relaxed shadow-sm",
            turn.role === "user"
              ? "ml-auto bg-[#111827] text-white"
              : "bg-white text-[#374151]",
          )}
        >
          <p>{turn.text}</p>
          {turn.cards && turn.role === "assistant" ? (
            <AgentActionCards cards={turn.cards} onAction={props.onAction} />
          ) : null}
        </div>
      ))}
      {props.busy ? (
        <div className="max-w-[70%] rounded-2xl bg-white px-3 py-2 text-[12px] text-[#9ca3af] shadow-sm">
          …
        </div>
      ) : null}
      <div ref={endRef} />
    </div>
  );
}
