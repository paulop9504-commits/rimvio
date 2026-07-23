/**
 * Toss-style Workspace map markers — clean white / blue pills.
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
    "gap:3px",
    "border:0",
    "background:transparent",
    "padding:0",
    "cursor:pointer",
    "font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Pretendard',sans-serif",
  ].join(";");

  const chip = document.createElement("span");
  const price = pin.amountLabel?.trim() || null;
  const pinned = Boolean(pin.bookmarked);
  const rating =
    pin.rating != null && Number.isFinite(pin.rating)
      ? pin.rating.toFixed(1)
      : null;
  const label = compact
    ? `★${rating ?? "—"}`
    : selected
      ? shortTitle(pin.title, 11)
      : pinned
        ? shortTitle(pin.title, 9)
        : `★${rating ?? String(index + 1)}`;

  chip.textContent = label;
  chip.style.cssText = [
    "display:inline-flex",
    "align-items:center",
    "justify-content:center",
    "gap:3px",
    "min-width:28px",
    "height:26px",
    compact
      ? "padding:0 8px"
      : selected || pinned
        ? "padding:0 10px"
        : "padding:0 8px",
    "border-radius:999px",
    "font-size:11px",
    "font-weight:700",
    "letter-spacing:-0.03em",
    "line-height:1",
    "box-shadow:0 1px 3px rgba(25,31,40,0.08), 0 0 0 1px rgba(25,31,40,0.04)",
    selected
      ? `background:${GLOBE_TOSS_THEME.blue};color:#fff;box-shadow:0 2px 8px rgba(49,130,246,0.35)`
      : pinned
        ? "background:#191f28;color:#fff"
        : "background:#fff;color:#191f28",
    "transition:transform 120ms ease, box-shadow 120ms ease",
    selected || pinned ? "transform:scale(1.04)" : "",
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
      "padding:2px 7px",
      "border-radius:999px",
      "font-size:10px",
      "font-weight:650",
      "letter-spacing:-0.02em",
      "color:#191f28",
      "background:rgba(255,255,255,0.96)",
      "box-shadow:0 1px 3px rgba(25,31,40,0.08)",
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
