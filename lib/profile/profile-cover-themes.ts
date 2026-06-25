export const PROFILE_COVER_THEMES = {
  default: "bg-gradient-to-br from-indigo-400 via-violet-400 to-fuchsia-400",
  sky: "bg-gradient-to-br from-sky-300 via-blue-400 to-indigo-500",
  mint: "bg-gradient-to-br from-emerald-300 via-teal-400 to-cyan-500",
  sunset: "bg-gradient-to-br from-amber-300 via-orange-400 to-rose-500",
  night: "bg-gradient-to-br from-slate-700 via-indigo-900 to-violet-950",
} as const;

export type ProfileCoverTheme = keyof typeof PROFILE_COVER_THEMES;

const THEME_SET = new Set<string>(Object.keys(PROFILE_COVER_THEMES));

export function normalizeProfileCoverTheme(
  raw: string | null | undefined,
): ProfileCoverTheme {
  const key = raw?.trim();
  if (key && THEME_SET.has(key)) {
    return key as ProfileCoverTheme;
  }
  return "default";
}

export function profileCoverThemeClass(theme: ProfileCoverTheme): string {
  return PROFILE_COVER_THEMES[theme];
}
