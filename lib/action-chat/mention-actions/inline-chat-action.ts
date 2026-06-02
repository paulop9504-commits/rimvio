/** Generic inline @ action chip wire — deeplink, clipboard, or capture. */

export type InlineChatActionAuxWire = {
  id: string;
  label: string;
  icon: string;
  deeplink?: string;
  actionKind?: "deeplink" | "clipboard" | "capture" | "internal";
  payload?: string;
};

export type InlineChatActionWire = {
  featureId: string;
  displayName: string;
  icon: string;
  query: string;
  summaryLines: string[];
  mainLabel: string;
  mainDeeplink?: string;
  mainActionKind?: "deeplink" | "clipboard" | "capture" | "internal";
  auxActions: InlineChatActionAuxWire[];
};

export function buildInlineChatActionWire(
  input: Omit<InlineChatActionWire, "auxActions"> & {
    auxActions?: InlineChatActionAuxWire[];
  },
): InlineChatActionWire {
  return {
    featureId: input.featureId,
    displayName: input.displayName.trim(),
    icon: input.icon,
    query: input.query.trim(),
    summaryLines: input.summaryLines.filter(Boolean),
    mainLabel: input.mainLabel.trim() || input.displayName.trim(),
    mainDeeplink: input.mainDeeplink?.trim(),
    mainActionKind: input.mainActionKind ?? "deeplink",
    auxActions: input.auxActions ?? [],
  };
}
