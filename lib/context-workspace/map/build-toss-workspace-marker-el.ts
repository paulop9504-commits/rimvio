/**
 * Toss-style Workspace map markers — white chips, blue when selected.
 */

import { GLOBE_TOSS_THEME } from "@/lib/globe/globe-toss-theme";
import type { WorkspaceMapPin } from "@/lib/context-workspace/map/workspace-map-provider";

function shortTitle(title: string, max = 10): string {
  const t = title.trim().replace(/\s+/gu, " ");
  if (t.length <= max) {
    return t;
  }
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

export function buildTossWorkspaceMarkerEl(input: {
  pin: WorkspaceMapPin;
  index: number;
  selected: boolean;
  compact?: boolean;
  onSelect: (id: string) => void;
}): HTMLButtonElement {
  const { pin, index, selected, compact, onSelect } = input;
  const el = document.createElement("button");
  el.type = "button";
  el.title = pin.title;
  el.setAttribute("aria-label", pin.title);
  el.style.cssText = [
    "display:flex",
    "flex-direction:column",
    "align-items:center",
    "gap:4px",
    "border:0",
    "background:transparent",
    "padding:0",
    "cursor:pointer",
    "font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Pretendard',sans-serif",
  ].join(";");

  const chip = document.createElement("span");
  const price = pin.amountLabel?.trim() || null;
  const pinned = Boolean(pin.bookmarked);
  const label = compact
    ? `★${pin.rating != null ? pin.rating.toFixed(1) : "—"}`
    : selected
      ? shortTitle(pin.title, 12)
      : pinned
        ? `📌 ${shortTitle(pin.title, 8)}`
        : `★${pin.rating != null ? pin.rating.toFixed(1) : String(index + 1)}`;

  chip.textContent = label;
  chip.style.cssText = [
    "display:inline-flex",
    "align-items:center",
    "justify-content:center",
    "min-width:28px",
    "height:28px",
    compact ? "padding:0 8px" : selected || pinned ? "padding:0 10px" : "padding:0 2px",
    "border-radius:999px",
    "font-size:11px",
    "font-weight:700",
    "letter-spacing:-0.02em",
    "line-height:1",
    "box-shadow:0 2px 8px rgba(25,31,40,0.12), 0 0 0 1px rgba(25,31,40,0.04)",
    selected
      ? `background:${GLOBE_TOSS_THEME.blue};color:#fff`
      : pinned
        ? "background:#191f28;color:#fff"
        : `background:#fff;color:${GLOBE_TOSS_THEME.ink}`,
    "transition:transform 120ms ease, box-shadow 120ms ease",
    selected || pinned ? "transform:scale(1.06)" : "",
  ]
    .filter(Boolean)
    .join(";");

  el.appendChild(chip);

  if (!compact && selected && price) {
    const priceChip = document.createElement("span");
    priceChip.textContent = price;
    priceChip.style.cssText = [
      "display:inline-flex",
      "align-items:center",
      "justify-content:center",
      "padding:3px 8px",
      "border-radius:999px",
      "font-size:10px",
      "font-weight:650",
      `color:${GLOBE_TOSS_THEME.ink}`,
      "background:rgba(255,255,255,0.96)",
      "box-shadow:0 1px 4px rgba(25,31,40,0.1)",
      "white-space:nowrap",
    ].join(";");
    el.appendChild(priceChip);
  }

  el.addEventListener("click", (event) => {
    event.stopPropagation();
    onSelect(pin.id);
  });

  return el;
}
