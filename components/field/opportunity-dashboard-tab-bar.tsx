"use client";

import { motion } from "framer-motion";
import { useCopy } from "@/hooks/use-copy";
import { cn } from "@/lib/utils";

import type { FieldDashboardTab } from "@/lib/nav/field-dashboard-types";

export type { FieldDashboardTab };

export type OpportunityDashboardTabBarProps = {
  value: FieldDashboardTab;
  onChange: (tab: FieldDashboardTab) => void;
  tradeCount: number;
  mineCount?: number;
  className?: string;
};

export function OpportunityDashboardTabBar({
  value,
  onChange,
  tradeCount,
  mineCount = 0,
  className,
}: OpportunityDashboardTabBarProps) {
  const copy = useCopy();
  const field = copy.globe.field;

  const tabs: readonly {
    id: FieldDashboardTab;
    label: string;
    count: number | null;
  }[] = [
    { id: "trades", label: field.dashboardTabTrades, count: tradeCount },
    { id: "discovery", label: field.dashboardTabDiscovery, count: null },
    { id: "mine", label: field.dashboardTabMine, count: mineCount },
  ];

  return (
    <div className={cn("shrink-0 pb-3 pt-0", className)}>
      <div
        role="tablist"
        aria-label={field.dashboardTabAria}
        className="grid grid-cols-3 gap-1 rounded-xl bg-[#eef1f4] p-1"
      >
        {tabs.map((tab) => {
          const active = value === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.id)}
              className={cn(
                "relative z-[1] min-h-[44px] rounded-[10px] transition-colors duration-200",
                active ? "text-[#191f28]" : "text-[#6b7684] active:opacity-80",
              )}
            >
              {active ? (
                <motion.span
                  layoutId="field-dashboard-tab-indicator"
                  className="pointer-events-none absolute inset-0 rounded-[10px] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)]"
                  transition={{ type: "spring", stiffness: 440, damping: 36 }}
                />
              ) : null}
              <span className="relative z-[1] flex h-full items-center justify-center gap-1 px-1.5">
                <span className="truncate text-[13px] font-semibold tracking-tight">
                  {tab.label}
                </span>
                {tab.count != null && tab.count > 0 ? (
                  <span
                    className={cn(
                      "min-w-[18px] shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums",
                      active ? "bg-[#3182f6] text-white" : "bg-white text-[#3182f6]",
                    )}
                  >
                    {tab.count > 9 ? "9+" : tab.count}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
