"use client";

import type { CapabilityDraft } from "@/lib/hub/capability/types";
import {
  MARKET_CATALOG,
  PLATFORM_MARKET_CODES,
  computeMarketReadinessPercent,
  createDefaultMarketDeployment,
  formatMarketDeploymentLabel,
  isMarketPublishReady,
  isRealMarketCode,
  type PlatformMarketCode,
  type PlatformMarketDeployment,
} from "@/lib/platform-sdk/markets";
import { cn } from "@/lib/utils";

const SELECTABLE_MARKETS = PLATFORM_MARKET_CODES.filter((c) => c !== "GLOBAL") as Exclude<
  PlatformMarketCode,
  "GLOBAL"
>[];

type MarketDeploymentPanelProps = {
  draft: CapabilityDraft;
  onChange: (patch: Partial<CapabilityDraft>) => void;
  compact?: boolean;
};

function toggleMarket(
  deployments: readonly PlatformMarketDeployment[],
  code: Exclude<PlatformMarketCode, "GLOBAL">,
  enabled: boolean,
  primary?: PlatformMarketCode,
): PlatformMarketDeployment[] {
  const exists = deployments.find((d) => d.country === code);
  if (enabled && !exists) {
    const next = [
      ...deployments,
      createDefaultMarketDeployment(code, { primary: primary === code }),
    ];
    return next;
  }
  if (!enabled && exists) {
    return deployments.filter((d) => d.country !== code);
  }
  return [...deployments];
}

function setReadinessComplete(
  deployment: PlatformMarketDeployment,
  key: keyof PlatformMarketDeployment["readiness"],
  state: "complete" | "pending" | "warning",
): PlatformMarketDeployment {
  const nextReadiness = { ...deployment.readiness, [key]: state };
  const percent = computeMarketReadinessPercent({ ...deployment, readiness: nextReadiness });
  return {
    ...deployment,
    readiness: nextReadiness,
    status: percent === 100 ? "approved" : deployment.status === "approved" ? "review" : deployment.status,
    commerce: deployment.commerce
      ? {
          ...deployment.commerce,
          paymentConfigured:
            key === "payment" ? state === "complete" : deployment.commerce.paymentConfigured,
          taxConfigured: key === "tax" ? state === "complete" : deployment.commerce.taxConfigured,
        }
      : deployment.commerce,
  };
}

export function MarketDeploymentPanel({ draft, onChange, compact }: MarketDeploymentPanelProps) {
  const deployments = draft.markets.deployments.filter((d) => isRealMarketCode(d.country));
  const selected = new Set(deployments.map((d) => d.country));

  const updateDeployment = (country: PlatformMarketCode, next: PlatformMarketDeployment) => {
    onChange({
      markets: {
        ...draft.markets,
        deployments: draft.markets.deployments.map((d) => (d.country === country ? next : d)),
      },
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[12px] font-semibold text-[#334155]">Where will this platform operate?</p>
        <p className="mt-1 text-[11px] text-[#94A3B8]">
          Platform Core는 국가 독립 · Market Deployment는 국가별 설정
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {SELECTABLE_MARKETS.map((code) => {
            const catalog = MARKET_CATALOG[code];
            const on = selected.has(code);
            return (
              <button
                key={code}
                type="button"
                onClick={() => {
                  const nextDeployments = toggleMarket(
                    draft.markets.deployments,
                    code,
                    !on,
                    draft.markets.primary,
                  );
                  const real = nextDeployments.filter((d) => isRealMarketCode(d.country));
                  onChange({
                    markets: {
                      ...draft.markets,
                      primary: real.find((d) => d.primary)?.country ?? real[0]?.country ?? "KR",
                      deployments: nextDeployments,
                    },
                  });
                }}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left text-[12px] transition-colors",
                  on
                    ? "border-[#6366F1] bg-[#EEF2FF] text-[#4338CA]"
                    : "border-[#E2E8F0] bg-white text-[#64748B]",
                )}
              >
                <span className="mr-1">{catalog.flag}</span>
                {catalog.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => onChange({ wantsGlobal: !draft.wantsGlobal })}
            className={cn(
              "rounded-lg border px-3 py-2 text-[12px]",
              draft.wantsGlobal
                ? "border-amber-400 bg-amber-50 text-amber-800"
                : "border-[#E2E8F0] bg-white text-[#64748B]",
            )}
          >
            🌏 Global
          </button>
        </div>
        {draft.wantsGlobal ? (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
            Global deployment requires country-specific configuration. 각 국가 Market을
            추가·완료해야 합니다.
          </p>
        ) : null}
      </div>

      {!compact ? (
        <div className="space-y-3">
          <p className="text-[12px] font-semibold text-[#334155]">Operator</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={draft.operator.name}
              onChange={(e) =>
                onChange({ operator: { ...draft.operator, name: e.target.value } })
              }
              placeholder="Operator name"
              className="h-9 rounded-lg border border-[#E2E8F0] px-3 text-[13px]"
            />
            <select
              value={draft.operator.headquartersCountry}
              onChange={(e) =>
                onChange({
                  operator: {
                    ...draft.operator,
                    headquartersCountry: e.target.value as PlatformMarketCode,
                  },
                })
              }
              className="h-9 rounded-lg border border-[#E2E8F0] px-3 text-[13px]"
            >
              {SELECTABLE_MARKETS.map((code) => (
                <option key={code} value={code}>
                  HQ · {MARKET_CATALOG[code].label}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        <p className="text-[12px] font-semibold text-[#334155]">Market Readiness</p>
        {deployments.length === 0 ? (
          <p className="text-[12px] text-amber-700">운영 국가를 하나 이상 선택하세요.</p>
        ) : (
          deployments.map((deployment) => {
            const percent = computeMarketReadinessPercent(deployment);
            const ready = isMarketPublishReady(deployment);
            return (
              <div
                key={deployment.country}
                className="rounded-xl border border-[#E2E8F0] bg-white p-4"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[13px] font-semibold text-[#0F172A]">
                    {formatMarketDeploymentLabel(deployment)}
                    {deployment.primary ? (
                      <span className="ml-2 text-[10px] font-medium text-[#6366F1]">
                        Primary
                      </span>
                    ) : null}
                  </p>
                  <span
                    className={cn(
                      "text-[11px] font-semibold",
                      ready ? "text-emerald-600" : "text-amber-600",
                    )}
                  >
                    {percent}% · {ready ? "Publish ready" : "Incomplete"}
                  </span>
                </div>
                <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-[#F1F5F9]">
                  <div
                    className={cn("h-full rounded-full", ready ? "bg-emerald-500" : "bg-[#6366F1]")}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="grid gap-2 text-[11px] sm:grid-cols-2">
                  {(
                    [
                      ["localization", "Localization"],
                      ["currency", "Currency"],
                      ["payment", "Payment"],
                      ["tax", "Tax"],
                      ["legal", "Legal"],
                      ["privacy", "Privacy"],
                      ["data_policy", "Data policy"],
                      ["terms", "Terms"],
                      ["shipping", "Shipping"],
                      ["seller_flow", "Seller flow"],
                      ["commerce", "Commerce"],
                    ] as const
                  ).map(([key, label]) => {
                    const state = deployment.readiness[key];
                    return (
                      <label key={key} className="flex items-center gap-2 text-[#64748B]">
                        <input
                          type="checkbox"
                          checked={state === "complete"}
                          onChange={(e) =>
                            updateDeployment(
                              deployment.country,
                              setReadinessComplete(
                                deployment,
                                key,
                                e.target.checked ? "complete" : "pending",
                              ),
                            )
                          }
                        />
                        <span
                          className={cn(
                            state === "complete" && "text-emerald-700",
                            state === "warning" && "text-amber-700",
                          )}
                        >
                          {state === "complete" ? "✓" : state === "warning" ? "⚠" : "○"} {label}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <p className="mt-2 text-[10px] text-[#94A3B8]">
                  {deployment.currency} · {deployment.timezone} · {deployment.addressSystem} address
                  {deployment.dataResidency ? ` · ${deployment.dataResidency}` : ""}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function MarketAvailabilityBadges({
  draft,
  className,
}: {
  draft: CapabilityDraft;
  className?: string;
}) {
  const deployments = draft.markets.deployments.filter((d) => isRealMarketCode(d.country));
  const ready = deployments.filter(isMarketPublishReady);
  const pending = deployments.filter((d) => !isMarketPublishReady(d));

  return (
    <div className={cn("space-y-2 text-[12px]", className)}>
      {ready.length > 0 ? (
        <div>
          <p className="mb-1 font-semibold text-emerald-700">Available in</p>
          <div className="flex flex-wrap gap-1">
            {ready.map((d) => (
              <span
                key={d.country}
                className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-800"
              >
                {formatMarketDeploymentLabel(d)} · {d.currency}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {pending.length > 0 ? (
        <div>
          <p className="mb-1 font-semibold text-[#94A3B8]">Not available in</p>
          <div className="flex flex-wrap gap-1">
            {pending.map((d) => (
              <span key={d.country} className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[#64748B]">
                {formatMarketDeploymentLabel(d)}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
