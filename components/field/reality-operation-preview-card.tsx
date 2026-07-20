"use client";

import { toast } from "sonner";
import { useCopy } from "@/hooks/use-copy";
import {
  deleteRealityOperation,
  reflectRealityOperation,
} from "@/lib/reality-queue/operation-actions";
import type { RealityQueueItemV1 } from "@/lib/reality-queue/types";
import { openPaymentVaultSettings } from "@/lib/payment-vault/open-payment-vault-settings-bridge";
import { cn } from "@/lib/utils";

export type RealityOperationPreviewCardProps = {
  item: RealityQueueItemV1;
  onClose: () => void;
  onChanged: () => void;
  className?: string;
};

/** Cursor Diff analog — Operation preview before Reality Commit. */
export function RealityOperationPreviewCard({
  item,
  onClose,
  onChanged,
  className,
}: RealityOperationPreviewCardProps) {
  const field = useCopy().globe.field;
  const preview = item.preview;

  const handleReflect = () => {
    reflectRealityOperation(item);
    toast.success(field.realityOperationReflectToast);
    onChanged();
    onClose();
  };

  const handleEdit = () => {
    if (item.type === "payment_prep" || item.kind === "finance") {
      openPaymentVaultSettings();
      toast.message("결제 수단을 확인해 주세요");
      return;
    }
    toast.message(field.realityOperationEditToast);
  };

  const handleDelete = () => {
    deleteRealityOperation(item);
    toast.message(field.realityOperationDeleteToast);
    onChanged();
    onClose();
  };

  return (
    <section
      className={cn(
        "rounded-[1.25rem] bg-white px-4 py-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.06]",
        className,
      )}
      data-reality-operation-preview={item.operationId}
      aria-label={field.realityOperationPreviewAria}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8e8e93]">
            {field.realityOperationTypeLabel} · {item.type}
          </p>
          <p className="mt-1 text-[16px] font-bold tracking-tight text-[#191f28]">
            {preview.titleKo}
          </p>
          {item.contextLabelKo ? (
            <p className="mt-0.5 text-[12px] text-[#8b95a1]">{item.contextLabelKo}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 text-[12px] font-medium text-[#8b95a1] active:opacity-70"
        >
          {field.realityOperationCloseCta}
        </button>
      </div>

      <dl className="mt-3 space-y-2 text-[13px]">
        {preview.providerLabelKo ? (
          <div className="flex justify-between gap-3">
            <dt className="text-[#8b95a1]">{field.realityOperationProviderLabel}</dt>
            <dd className="font-medium text-[#191f28]">{preview.providerLabelKo}</dd>
          </div>
        ) : null}
        {preview.placeLabelKo ? (
          <div className="flex justify-between gap-3">
            <dt className="text-[#8b95a1]">{field.realityOperationPlaceLabel}</dt>
            <dd className="max-w-[60%] truncate font-medium text-[#191f28]">
              {preview.placeLabelKo}
            </dd>
          </div>
        ) : null}
        {preview.amountLabel || item.amountLabel ? (
          <div className="flex justify-between gap-3">
            <dt className="text-[#8b95a1]">{field.realityOperationAmountLabel}</dt>
            <dd className="font-semibold tabular-nums text-[#191f28]">
              {preview.amountLabel || item.amountLabel}
            </dd>
          </div>
        ) : null}
        {preview.cancelPolicyKo ? (
          <div className="flex justify-between gap-3">
            <dt className="text-[#8b95a1]">{field.realityOperationCancelLabel}</dt>
            <dd className="font-medium text-[#191f28]">{preview.cancelPolicyKo}</dd>
          </div>
        ) : null}
        {preview.confidencePct != null ? (
          <div className="flex justify-between gap-3">
            <dt className="text-[#8b95a1]">{field.realityOperationConfidenceLabel}</dt>
            <dd className="font-semibold tabular-nums text-[#0071e3]">
              {preview.confidencePct}%
            </dd>
          </div>
        ) : null}
        {item.needApproval ? (
          <div className="flex justify-between gap-3">
            <dt className="text-[#8b95a1]">{field.realityOperationApprovalLabel}</dt>
            <dd className="font-medium text-amber-700">YES</dd>
          </div>
        ) : null}
      </dl>

      {(preview.diffFromKo || preview.diffToKo) && (
        <div
          className="mt-3 rounded-xl bg-[#f5f5f7] px-3 py-2.5"
          data-reality-diff
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8e8e93]">
            Reality Diff
          </p>
          {preview.diffFromKo ? (
            <p className="mt-1 text-[12px] text-[#8b95a1] line-through">
              {preview.diffFromKo}
            </p>
          ) : null}
          {preview.diffToKo ? (
            <p className="mt-0.5 text-[13px] font-medium text-[#191f28]">
              → {preview.diffToKo}
            </p>
          ) : null}
        </div>
      )}

      {item.dependencyNoteKo ? (
        <p className="mt-2 text-[12px] leading-snug text-amber-700">
          {item.dependencyNoteKo}
        </p>
      ) : null}

      {item.expiresAtIso ? (
        <p className="mt-2 text-[11px] text-[#aeaeb2]">
          {field.realityOperationExpiresHint}
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={handleReflect}
          className="min-h-[42px] rounded-xl bg-[#191f28] text-[13px] font-semibold text-white active:scale-[0.99]"
          data-reality-operation-reflect
        >
          {field.realityOperationReflectCta}
        </button>
        <button
          type="button"
          onClick={handleEdit}
          className="min-h-[42px] rounded-xl bg-[#f2f2f7] text-[13px] font-semibold text-[#191f28] active:opacity-80"
          data-reality-operation-edit
        >
          {field.realityOperationEditCta}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="min-h-[42px] rounded-xl bg-[#f2f2f7] text-[13px] font-semibold text-rose-600 active:opacity-80"
          data-reality-operation-delete
        >
          {field.realityOperationDeleteCta}
        </button>
      </div>
    </section>
  );
}
