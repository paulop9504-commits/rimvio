const URL_IN_TEXT =
  /https?:\/\/[^\s<>"{}|\\^`[\]]+/i;

function stripTrailingPunctuation(value: string) {
  return value.replace(/[)\]}>,.!?;:'"]+$/g, "");
}

export function normalizeShareUrl(raw: string) {
  const trimmed = raw.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  return new URL(withProtocol).href;
}

export function parseSharePayload(input: {
  title?: string;
  text?: string;
  url?: string;
}) {
  const title = input.title?.trim() || null;
  const text = input.text?.trim() || "";
  const explicitUrl = input.url?.trim() || "";

  if (explicitUrl) {
    try {
      return {
        url: normalizeShareUrl(stripTrailingPunctuation(explicitUrl)),
        title,
      };
    } catch {
      // Fall through to text parsing.
    }
  }

  const match = text.match(URL_IN_TEXT);
  if (match) {
    const url = stripTrailingPunctuation(match[0]);

    try {
      const normalized = normalizeShareUrl(url);
      const leftoverTitle = text.replace(match[0], "").trim();

      return {
        url: normalized,
        title: title || leftoverTitle || null,
      };
    } catch {
      return { url: null, title };
    }
  }

  return { url: null, title };
}
