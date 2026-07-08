/** Pull named places from convergence chip copy (예: 디즈니, 우에노). */

const EXAMPLE_PREFIX =
  /(?:예|例|e\.g\.|eg)\s*[:：]\s*/iu;

function splitLandmarkList(raw: string): string[] {
  return raw
    .split(/[,，、·•|/]/u)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2)
    .slice(0, 3);
}

export function extractLandmarkHintsFromText(
  text: string | null | undefined,
): readonly string[] {
  const source = text?.trim();
  if (!source) {
    return [];
  }

  const paren = source.match(/[（(]([^)）]+)[)）]/u);
  if (paren?.[1]) {
    const inner = paren[1].replace(EXAMPLE_PREFIX, "").trim();
    const fromParen = splitLandmarkList(inner);
    if (fromParen.length > 0) {
      return fromParen;
    }
  }

  const inline = source.match(
    /(?:예|例)\s*[:：]\s*([^.。\n]+)/iu,
  );
  if (inline?.[1]) {
    return splitLandmarkList(inline[1]);
  }

  return [];
}

export function extractLandmarkHintsFromChoice(input: {
  label?: string | null;
  value?: string | null;
  landmarks?: readonly string[] | null;
}): readonly string[] {
  if (input.landmarks && input.landmarks.length > 0) {
    return input.landmarks
      .map((row) => row.trim())
      .filter((row) => row.length >= 2)
      .slice(0, 3);
  }
  const fromLabel = extractLandmarkHintsFromText(input.label);
  if (fromLabel.length > 0) {
    return fromLabel;
  }
  return extractLandmarkHintsFromText(input.value);
}
