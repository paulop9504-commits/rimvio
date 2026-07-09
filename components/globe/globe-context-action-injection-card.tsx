"use client";

import { copy } from "@/lib/copy/human-ko";
import { rimvioHeroCtaClass } from "@/lib/design/rimvio-ontology";
import { openLodgingHubCheckout } from "@/lib/globe/hub-checkout/open-lodging-hub-checkout-bridge";
import type { ContextActionInjection } from "@/lib/globe/context-action-injection/types";
import { cn } from "@/lib/utils";

export type GlobeContextActionInjectionCardProps = {
  injection: ContextActionInjection;
  onConfirm: () => void;
  onReject: () => void;
  onExecute?: () => void;
  className?: string;
};

/** Intent → Confirm → injected CTA (button appears only after confirm). */
export function GlobeContextActionInjectionCard({
  injection,
  onConfirm,
  onReject,
  onExecute,
  className,
}: GlobeContextActionInjectionCardProps) {
  const showInjected =
    injection.phase === "injected" && injection.injectedAction != null;

  return (
    <div
      className={cn(
        "space-y-2 rounded-xl bg-white px-2.5 py-2.5 ring-1 ring-black/[0.05]",
        className,
      )}
      data-globe-context-action-injection
      data-globe-context-action-injection-phase={injection.phase}
      data-globe-context-action-intent={injection.intent.kind}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">
        {showInjected
          ? copy.globe.contextActionInjectedEyebrow
          : copy.globe.contextActionInjectionEyebrow}
      </p>
      <p className="text-[12px] leading-relaxed text-[#1d1d1f]">
        {injection.confirmPromptKo}
      </p>
      <div className="rounded-lg bg-[#f5f5f7] px-2.5 py-2">
        <p className="text-[13px] font-semibold text-[#1d1d1f]">
          {injection.target.title}
        </p>
        {injection.target.priceLineKo ? (
          <p className="mt-0.5 text-[11px] text-[#86868b]">
            {injection.target.priceLineKo}
          </p>
        ) : null}
        {injection.target.addressKo ? (
          <p className="mt-0.5 truncate text-[11px] text-[#86868b]">
            {injection.target.addressKo}
          </p>
        ) : null}
      </div>

      {showInjected && injection.injectedAction ? (
        <button
          type="button"
          className={cn(rimvioHeroCtaClass, "w-full")}
          data-globe-context-action-injected
          data-globe-context-action-type={injection.injectedAction.actionTypeId}
          onClick={() => {
            const href = injection.injectedAction?.href;
            if (!href) {
              return;
            }
            if (
              injection.injectedAction.internalRoute &&
              href === "rimvio://hub/lodging-checkout"
            ) {
              openLodgingHubCheckout({
                contextEventId: injection.contextEventId,
                placeId: injection.target.placeId,
              });
              onExecute?.();
              return;
            }
            if (injection.injectedAction.internalRoute) {
              if (href.startsWith("rimvio://field/")) {
                window.dispatchEvent(
                  new CustomEvent("rimvio:open-field", {
                    detail: { tab: "mine" },
                  }),
                );
              }
            } else {
              window.open(href, "_blank", "noopener,noreferrer");
            }
            onExecute?.();
          }}
        >
          {injection.injectedAction.labelKo}
        </button>
      ) : injection.phase === "awaiting_confirm" ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-10 flex-1 rounded-full bg-[#1d1d1f] px-3 text-[12px] font-semibold text-white active:scale-[0.98]"
            data-globe-context-action-confirm
          >
            {injection.confirmAcceptLabelKo}
          </button>
          <button
            type="button"
            onClick={onReject}
            className="min-h-10 flex-1 rounded-full bg-black/[0.05] px-3 text-[12px] font-semibold text-[#515154] active:scale-[0.98]"
            data-globe-context-action-reject
          >
            {injection.confirmRejectLabelKo}
          </button>
        </div>
      ) : null}
    </div>
  );
}
