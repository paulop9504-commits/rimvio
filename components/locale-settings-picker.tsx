"use client";

import { APP_LOCALES } from "@/lib/i18n/types";
import { appLocaleLabel } from "@/lib/i18n/locale-labels";
import type { AppLocale } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";

type LocaleSettingsPickerProps = {
  value: AppLocale;
  onChange: (locale: AppLocale) => void;
  className?: string;
};

export function LocaleSettingsPicker({
  value,
  onChange,
  className,
}: LocaleSettingsPickerProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-2 sm:grid-cols-3", className)}>
      {APP_LOCALES.map((locale) => {
        const selected = locale === value;
        return (
          <button
            key={locale}
            type="button"
            onClick={() => onChange(locale)}
            className={cn(
              "rounded-2xl px-3 py-2.5 text-left text-[14px] font-semibold transition-colors ring-1",
              selected
                ? "bg-[#3182f6] text-white ring-[#3182f6]"
                : "bg-rimvio-surface text-foreground ring-black/[0.06] active:bg-rimvio-surface-muted",
            )}
          >
            {appLocaleLabel(locale)}
          </button>
        );
      })}
    </div>
  );
}
