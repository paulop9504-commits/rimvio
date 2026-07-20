"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { SettingsSection } from "@/components/settings/settings-section";
import { copy } from "@/lib/copy/human-ko";
import type { HubCheckoutPaymentMethod } from "@/lib/globe/hub-checkout/types";
import { buildPaymentDisplayLabel } from "@/lib/payment-vault/build-payment-display-label";
import { readPaymentVaultBundleClient } from "@/lib/payment-vault/read-payment-vault-bundle-client";
import { savePaymentPreferenceClient } from "@/lib/payment-vault/save-payment-preference-client";
import { mapVaultWriteErrorCopy } from "@/lib/vault/map-vault-write-error-copy";
import { cn } from "@/lib/utils";

const METHODS: readonly {
  id: HubCheckoutPaymentMethod;
  label: string;
  icon: typeof CreditCard;
}[] = [
  { id: "in_app_card", label: copy.paymentVault.methodCard, icon: CreditCard },
  { id: "kakaopay", label: copy.paymentVault.methodKakao, icon: Smartphone },
  { id: "tosspay", label: copy.paymentVault.methodToss, icon: Smartphone },
];

type PaymentVaultSettingsPanelProps = {
  className?: string;
  onSaved?: () => void;
};

/** Settings > 결제 수단 — preference only (no raw card storage). */
export function PaymentVaultSettingsPanel({
  className,
  onSaved,
}: PaymentVaultSettingsPanelProps) {
  const pv = copy.paymentVault;
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState<HubCheckoutPaymentMethod>("kakaopay");
  const [cardLast4, setCardLast4] = useState("");

  const load = useCallback(async () => {
    const bundle = await readPaymentVaultBundleClient();
    if (bundle.preference) {
      setMethod(bundle.preference.method);
      setCardLast4(bundle.preference.cardLast4 ?? "");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    setBusy(true);
    try {
      const result = await savePaymentPreferenceClient({
        method,
        cardLast4: method === "in_app_card" ? cardLast4 : null,
      });
      if (!result.ok) {
        toast.error(
          mapVaultWriteErrorCopy(result.error, {
            saveFailed: pv.saveFailed,
            saveNeedLogin: pv.saveNeedLogin,
            saveVaultUnavailable: pv.saveVaultUnavailable,
          }),
        );
        return;
      }
      toast.success(pv.saveDone);
      onSaved?.();
    } finally {
      setBusy(false);
    }
  };

  const previewLabel = buildPaymentDisplayLabel({
    method,
    cardLast4: method === "in_app_card" ? cardLast4 : null,
  });

  return (
    <SettingsSection title={pv.settingsTitle} className={className}>
      <div data-payment-vault-settings>
      <p className="mb-3 text-[12px] leading-relaxed text-[#6e6e73]">{pv.settingsHint}</p>
      {loading ? (
        <div className="h-24 animate-pulse rounded-2xl bg-[#f2f2f7]" />
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map((row) => {
              const Icon = row.icon;
              const active = method === row.id;
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setMethod(row.id)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 text-[11px] font-semibold transition",
                    active
                      ? "bg-[#0071e3] text-white shadow-[0_8px_18px_rgba(0,113,227,0.28)]"
                      : "bg-[#f2f2f7] text-[#1d1d1f]",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {row.label}
                </button>
              );
            })}
          </div>

          {method === "in_app_card" ? (
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-medium text-[#3c3c43]">
                {pv.cardLast4Label}
              </span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={cardLast4}
                onChange={(event) =>
                  setCardLast4(event.target.value.replace(/\D/g, "").slice(0, 4))
                }
                placeholder={pv.cardLast4Placeholder}
                className="h-10 w-full rounded-xl border-0 bg-[#f5f5f7] px-3 text-[13px] text-[#1d1d1f] outline-none focus:ring-2 focus:ring-[#0071e3]/25"
              />
            </label>
          ) : null}

          <p className="rounded-xl bg-[#f5f9ff] px-3 py-2 text-[12px] text-[#3a3a3c]">
            {previewLabel}
          </p>

          <button
            type="button"
            disabled={busy}
            onClick={() => void handleSave()}
            className="w-full rounded-2xl bg-[#1d1d1f] px-3 py-3 text-[14px] font-semibold text-white disabled:opacity-50"
          >
            {busy ? "…" : pv.saveCta}
          </button>
        </div>
      )}
      </div>
    </SettingsSection>
  );
}
