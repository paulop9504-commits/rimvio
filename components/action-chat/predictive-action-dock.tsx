"use client";

import { AuxSeedButton } from "@/components/action-chat/aux-seed-button";
import { MainActionButton } from "@/components/action-chat/main-action-button";
import { resolveMainActionBrandStyle } from "@/lib/brand/action-brand-style";
import type { PredictiveDockAction } from "@/lib/predictive-dock/types";
import { ActionDockWhyLine } from "@/components/action-dock/action-dock-why-line";
import { cn } from "@/lib/utils";

type PredictiveActionDockProps = {
  actions: PredictiveDockAction[];
  onSelect: (action: PredictiveDockAction) => void;
  className?: string;
};

function partitionDockActions(actions: PredictiveDockAction[]) {
  const main =
    actions.find((action) => action.action_tier === "MAIN") ??
    actions.find((action) => action.state === "ACTIVE") ??
    null;
  const aux = actions.filter((action) => action.id !== main?.id);
  return { main, aux };
}

/** MAIN hero + AUX 알맹이 seeds only. */
export function PredictiveActionDock({
  actions,
  onSelect,
  className,
}: PredictiveActionDockProps) {
  if (actions.length === 0) {
    return null;
  }

  const { main, aux } = partitionDockActions(actions);

  return (
    <div className={cn("space-y-2 px-1 pb-2 pt-1", className)} aria-label="Action Opportunity">
      {main ? (
        <div className="space-y-1">
          <MainActionButton
            label={main.label}
            brand={resolveMainActionBrandStyle({
              id: main.id,
              label: main.label,
              plugin: main.plugin,
              type: main.type,
            })}
            rounded="2xl"
            icon={<span className="text-[18px]">{main.icon}</span>}
            onClick={() => onSelect(main)}
          />
          {main.rankingWhy ? (
            <ActionDockWhyLine line={main.rankingWhy} className="px-1" />
          ) : null}
        </div>
      ) : null}

      {aux.length > 0 ? (
        <div
          className="flex flex-wrap gap-1.5 px-0.5"
          aria-label="보조 액션"
        >
          {aux.map((item) => (
            <AuxSeedButton
              key={item.id}
              label={item.label}
              onClick={() => onSelect(item)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
