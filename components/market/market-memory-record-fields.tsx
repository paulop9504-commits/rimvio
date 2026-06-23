"use client";

import type { MarketIntentDraft } from "@/lib/globe/market/market-intent-types";
import type { MarketMemoryRecord } from "@/lib/globe/market/market-intent-detail";
import { resolveMarketMemoryTemplate } from "@/lib/globe/market/memory/market-memory-template";
import { syncMarketMemoryRecordOnDraft } from "@/lib/globe/market/memory/sync-market-memory-record";
import { copy } from "@/lib/copy/human-ko";
import { rimvioComposerFieldClass } from "@/lib/brand/rimvio-neon-theme";
import { RIMVIO_TYPE } from "@/lib/design/rimvio-ontology";
import { cn } from "@/lib/utils";

export type MarketMemoryRecordFieldsProps = {
  draft: MarketIntentDraft;
  onChange: (draft: MarketIntentDraft) => void;
};

function Field({
  label,
  placeholder,
  value,
  onValue,
}: {
  label: string;
  placeholder: string;
  value: string;
  onValue: (next: string) => void;
}) {
  return (
    <label className="block">
      <span className={cn(RIMVIO_TYPE.caption, "mb-1 block font-medium text-foreground")}>
        {label}
      </span>
      <textarea
        className={cn(rimvioComposerFieldClass, "min-h-[72px] w-full resize-none px-3 py-2.5 text-[15px]")}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onValue(event.target.value)}
      />
    </label>
  );
}

export function MarketMemoryRecordFields({ draft, onChange }: MarketMemoryRecordFieldsProps) {
  const template = resolveMarketMemoryTemplate(
    draft.categoryId,
    draft.detail.productName || draft.title,
  );
  const memory = draft.detail.memoryRecord;
  const isListing = draft.role === "listing";

  const patch = (partial: Partial<MarketMemoryRecord>) => {
    onChange(syncMarketMemoryRecordOnDraft(draft, partial));
  };

  return (
    <div className="space-y-4">
      <p className={cn(RIMVIO_TYPE.caption, "rounded-xl bg-primary/5 px-3 py-2 text-[13px]")}>
        {copy.globe.marketMemoryStepEyebrow}
        {" · "}
        {isListing ? copy.globe.marketMemoryStepBodyListing : copy.globe.marketMemoryStepBodySeeking}
      </p>

      {isListing ? (
        <>
          <Field
            label={template.categoryPromptKo}
            placeholder={template.categoryPromptPlaceholderKo}
            value={memory.categoryAnswer}
            onValue={(categoryAnswer) => patch({ categoryAnswer })}
          />
          <Field
            label={template.storyLabelKo}
            placeholder={template.storyPlaceholderKo}
            value={memory.story}
            onValue={(story) => patch({ story })}
          />
          <Field
            label={template.careLabelKo}
            placeholder={template.carePlaceholderKo}
            value={memory.care}
            onValue={(care) => patch({ care })}
          />
          <Field
            label={template.whyLabelKo}
            placeholder={template.whyPlaceholderKo}
            value={memory.why}
            onValue={(why) => patch({ why })}
          />
        </>
      ) : (
        <>
          <Field
            label={template.seekingContextLabelKo}
            placeholder={template.seekingContextPlaceholderKo}
            value={memory.seekingContext}
            onValue={(seekingContext) => patch({ seekingContext })}
          />
          <Field
            label={template.seekingWhyLabelKo}
            placeholder={template.seekingWhyPlaceholderKo}
            value={memory.seekingWhy}
            onValue={(seekingWhy) => patch({ seekingWhy })}
          />
        </>
      )}

      {memory.experienceTags.length > 0 ? (
        <div>
          <p className={cn(RIMVIO_TYPE.caption, "mb-2 font-medium text-foreground")}>
            {copy.globe.marketMemoryTagsLabel}
          </p>
          <div className="flex flex-wrap gap-2">
            {memory.experienceTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-primary/10 px-2.5 py-1 text-[12px] font-medium text-primary"
              >
                {tag}
              </span>
            ))}
          </div>
          <p className={cn("mt-1.5", RIMVIO_TYPE.caption)}>
            {copy.globe.marketMemoryTagsHint}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function MarketExperienceTagPills({ tags }: { tags: readonly string[] }) {
  if (tags.length === 0) {
    return null;
  }
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
