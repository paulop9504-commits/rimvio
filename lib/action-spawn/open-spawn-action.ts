/** Open spawn action deeplink — web URL, tel, or glango:// prompt. */
export function openSpawnAction(input: {
  deeplink: string;
  onPrompt?: (uri: string) => void;
}): void {
  const uri = input.deeplink.trim();
  if (!uri) {
    return;
  }

  if (uri.startsWith("glango://")) {
    input.onPrompt?.(uri);
    return;
  }

  if (typeof window === "undefined") {
    return;
  }

  if (uri.startsWith("tel:")) {
    window.location.href = uri;
    return;
  }

  window.open(uri, "_blank", "noopener,noreferrer");
}
