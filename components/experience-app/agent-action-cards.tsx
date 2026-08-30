"use client";

import { cn } from "@/lib/utils";
import type { AgentActionCard } from "@/lib/experience-app/surface-types";
import { formatOrderMoneyKrw } from "@/lib/experience-app/projection";
import type { StoreRecord } from "@/lib/experience-app/types";
import { ChevronRight } from "lucide-react";

export function AgentActionCards(props: {
  readonly cards: readonly AgentActionCard[];
  readonly onAction: (card: AgentActionCard) => void;
}) {
  if (props.cards.length === 0) return null;
  return (
    <div className="mt-2 space-y-2">
      {props.cards.map((card, i) => (
        <ActionCard key={`${card.kind}-${i}`} card={card} onAction={props.onAction} />
      ))}
    </div>
  );
}

function ActionCard(props: {
  readonly card: AgentActionCard;
  readonly onAction: (card: AgentActionCard) => void;
}) {
  const { card } = props;
  if (card.kind === "store_card") {
    const store = card.payload?.store as StoreRecord | undefined;
    if (!store) return null;
    return (
      <button
        type="button"
        onClick={() => props.onAction(card)}
        className="flex w-full items-center justify-between rounded-2xl border border-[#e5e7eb] bg-white px-3 py-3 text-left shadow-sm transition active:scale-[0.99]"
      >
        <div>
          <p className="text-[13px] font-semibold text-[#111827]">🍗 {store.name}</p>
          <p className="text-[11px] text-[#6b7280]">
            ⭐ 4.8 · 도보 {store.walkMinutes}분 · 25~35분
          </p>
        </div>
        <ChevronRight className="size-4 text-[#6366f1]" />
      </button>
    );
  }
  if (card.kind === "order_card") {
    const title = String(card.payload?.title ?? "");
    const subtitle = String(card.payload?.subtitle ?? "");
    const amount = Number(card.payload?.amountKrw ?? 0);
    return (
      <button
        type="button"
        onClick={() => props.onAction(card)}
        className="flex w-full items-center justify-between rounded-2xl border border-violet-100 bg-violet-50 px-3 py-3 text-left"
      >
        <div>
          <p className="text-[13px] font-semibold text-violet-900">{title}</p>
          <p className="text-[11px] text-violet-700">{subtitle}</p>
        </div>
        <div className="text-right">
          {amount > 0 ? (
            <p className="text-[12px] font-semibold text-violet-900">{formatOrderMoneyKrw(amount)}</p>
          ) : null}
          <p className="text-[10px] font-semibold text-[#6366f1]">{card.label}</p>
        </div>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => props.onAction(card)}
      className={cn(
        "inline-flex items-center gap-1 rounded-xl px-3 py-2 text-[12px] font-semibold",
        card.kind === "merchant_surface"
          ? "bg-[#111827] text-white"
          : "bg-[#6366f1] text-white",
      )}
    >
      {card.label}
      <ChevronRight className="size-3.5" />
    </button>
  );
}
