import type { copy as copyKo } from "@/lib/copy/human-ko";

/** Locale bundles may use translated strings — not KO literal types. */
type LocalizedCopy<T> = T extends (...args: infer A) => unknown
  ? (...args: A) => string
  : T extends object
    ? { [K in keyof T]: LocalizedCopy<T[K]> }
    : string;

export type Copy = LocalizedCopy<typeof copyKo>;

export type AppLocale =
  | "ko"
  | "en"
  | "ja"
  | "zh"
  | "th"
  | "vi"
  | "id"
  | "hi"
  | "es"
  | "fr"
  | "de"
  | "it"
  | "pt"
  | "fil";

export const APP_LOCALES: AppLocale[] = [
  "ko",
  "en",
  "ja",
  "zh",
  "th",
  "vi",
  "id",
  "hi",
  "es",
  "fr",
  "de",
  "it",
  "pt",
  "fil",
];

export function isAppLocale(value: string): value is AppLocale {
  return (APP_LOCALES as string[]).includes(value);
}
