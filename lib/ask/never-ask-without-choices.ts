/**
 * Never ask the user to “pick” with zero selectable options.
 * Empty-choice asks are a hard UX defect (hint without chips).
 */

export type SelectableAskChoice = {
  readonly id: string;
  readonly labelKo: string;
};

/** True only when the ask can be answered by tapping something. */
export function hasSelectableAskChoices(
  choices: readonly SelectableAskChoice[] | null | undefined,
): boolean {
  return Boolean(
    choices &&
      choices.length > 0 &&
      choices.some((c) => Boolean(c.id?.trim() && c.labelKo?.trim())),
  );
}

/**
 * Returns choices if ask is valid; otherwise null (caller must not show “골라 주세요”).
 */
export function requireSelectableAskChoices<T extends SelectableAskChoice>(
  choices: readonly T[] | null | undefined,
): readonly T[] | null {
  if (!hasSelectableAskChoices(choices)) {
    return null;
  }
  return choices as readonly T[];
}
