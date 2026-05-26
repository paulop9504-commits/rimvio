import { triggerActionHaptic } from "@/lib/action-shadowing";
import type { LinkActionItem } from "@/types/database";

export function readActionCopyText(action: LinkActionItem): string | null {
  const value = action.payload?.copyText;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function copyActionText(
  action: LinkActionItem
): Promise<string | null> {
  const text = readActionCopyText(action);
  if (!text || typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return null;
  }

  try {
    await navigator.clipboard.writeText(text);
    return text;
  } catch {
    return null;
  }
}

function openHref(href: string) {
  triggerActionHaptic();
  window.location.assign(href);
}

export type RunLinkActionResult = {
  copiedText: string | null;
};

export async function runLinkAction(
  action: LinkActionItem
): Promise<RunLinkActionResult> {
  const copiedText = await copyActionText(action);

  switch (action.kind) {
    case "open":
      if (action.href) {
        openHref(action.href);
      }
      break;
    case "copy":
      triggerActionHaptic();
      if (!copiedText && action.payload?.copyText) {
        await copyActionText(action);
      } else if (action.href && !copiedText) {
        try {
          await navigator.clipboard.writeText(action.href);
        } catch {
          // Clipboard blocked.
        }
      }
      break;
    case "share":
      triggerActionHaptic();
      if (action.href && typeof navigator !== "undefined" && navigator.share) {
        void navigator.share({ title: action.label, url: action.href });
      }
      break;
    default:
      if (action.href) {
        openHref(action.href);
      } else {
        triggerActionHaptic();
      }
  }

  return { copiedText };
}
