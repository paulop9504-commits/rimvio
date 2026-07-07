import type { BrainSurfaceProjectionCandidate } from "@/lib/situation-projection/brain-surface-types";
import {
  resolveBrainSurfaceMarkerMediaKind,
} from "@/lib/globe/brain-surface-marker-media";
import { sanitizeMapMarkerSupportLabel } from "@/lib/globe/resolve-context-resource-map-markers";
import { prependGlobeDiscoveryPillThumbnail } from "@/lib/globe/globe-map-callout-element";

export type GlobeBrainSurfaceMarkerHandlers = {
  onPress: (candidateId: string) => void;
};

function fallbackGlyph(
  family: BrainSurfaceProjectionCandidate["family"],
): string {
  switch (family) {
    case "media":
      return "영";
    case "trace_place":
      return "추";
    case "eatery":
      return "맛";
    case "lodging":
      return "숙";
    case "info":
      return "정";
    case "event":
      return "행";
    case "memo":
    default:
      return "메";
  }
}

function confidenceGlow(confidence: number | null | undefined): string {
  if (confidence == null || !Number.isFinite(confidence)) {
    return "0 10px 24px rgba(0,0,0,0.24)";
  }
  const clamped = Math.min(Math.max(confidence, 0), 1);
  const alpha = 0.18 + clamped * 0.42;
  const spread = 10 + Math.round(clamped * 18);
  return `0 ${spread}px ${spread + 14}px rgba(120, 196, 255, ${alpha.toFixed(2)})`;
}

function indexZBoostFromCallout(callout: { x: number; y: number }): number {
  return Math.round(Math.hypot(callout.x, callout.y) / 18);
}

function readCalloutOffset(candidate: BrainSurfaceProjectionCandidate): {
  x: number;
  y: number;
} | null {
  const x = candidate.calloutOffsetX;
  const y = candidate.calloutOffsetY;
  if (x == null || y == null || !Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }
  if (x === 0 && y === 0) {
    return null;
  }
  return { x, y };
}

function mapMarkerBadgeLabel(
  candidate: BrainSurfaceProjectionCandidate,
): string | null {
  if (candidate.anchorKind !== "inferred_place") {
    return null;
  }
  const raw = candidate.badgeLabelKo?.trim();
  if (!raw || /노드$/u.test(raw)) {
    return null;
  }
  return raw;
}

function mapMarkerDetailLabel(
  candidate: BrainSurfaceProjectionCandidate,
): string | null {
  const detail = sanitizeMapMarkerSupportLabel(candidate.previewBody?.trim());
  if (!detail || detail === candidate.label.trim()) {
    if (candidate.anchorKind === "inferred_place" && candidate.confidenceLabelKo) {
      return candidate.confidenceLabelKo;
    }
    return null;
  }
  return detail;
}

function familyCategoryLabel(
  family: BrainSurfaceProjectionCandidate["family"],
): string {
  switch (family) {
    case "media":
      return "영상";
    case "eatery":
      return "맛집";
    case "lodging":
      return "숙소";
    case "trace_place":
      return "장소";
    case "info":
      return "정보";
    case "event":
      return "행사";
    case "memo":
      return "메모";
    default:
      return "맥락";
  }
}

function buildStoryThumbnail(
  candidate: BrainSurfaceProjectionCandidate,
): HTMLSpanElement {
  const ring = document.createElement("span");
  ring.className = "rimvio-globe-brain-surface-marker__story-ring";

  const shell = document.createElement("span");
  shell.className = "rimvio-globe-brain-surface-marker__story-shell";

  const thumbUrl = candidate.markerThumbnailUrl?.trim();
  if (thumbUrl) {
    const image = document.createElement("img");
    image.src = thumbUrl;
    image.alt = "";
    image.className = "rimvio-globe-brain-surface-marker__story-thumb";
    image.draggable = false;
    image.addEventListener("error", () => {
      image.remove();
      const fallback = document.createElement("span");
      fallback.className = "rimvio-globe-brain-surface-marker__story-fallback";
      fallback.textContent = fallbackGlyph(candidate.family);
      shell.appendChild(fallback);
    });
    shell.appendChild(image);
  } else {
    const fallback = document.createElement("span");
    fallback.className = "rimvio-globe-brain-surface-marker__story-fallback";
    fallback.textContent = fallbackGlyph(candidate.family);
    shell.appendChild(fallback);
  }

  if (
    candidate.markerMediaKind === "video" ||
    resolveBrainSurfaceMarkerMediaKind({
      family: candidate.family,
      embedUrl: candidate.embedUrl,
    }) === "video"
  ) {
    const play = document.createElement("span");
    play.className = "rimvio-globe-brain-surface-marker__story-play";
    play.textContent = "▶";
    shell.appendChild(play);
  }

  ring.appendChild(shell);
  return ring;
}

function buildDiscoveryPill(
  candidate: BrainSurfaceProjectionCandidate,
): HTMLSpanElement {
  const pill = document.createElement("span");
  pill.className = "rimvio-globe-lodging-marker__discovery-pill";
  pill.dataset.brainSurfaceFamily = candidate.family;
  const markerStyle = candidate.markerStyle ?? "dashed";
  pill.style.border =
    markerStyle === "solid"
      ? "1px solid rgba(15, 23, 42, 0.1)"
      : "1px dashed rgba(15, 23, 42, 0.24)";
  pill.style.boxShadow = confidenceGlow(candidate.confidence);
  if ((candidate.focusPriority ?? 0) >= 80) {
    pill.style.boxShadow = `${confidenceGlow(candidate.confidence)}, 0 14px 32px rgba(0,0,0,0.34)`;
  }
  if (candidate.anchorKind === "inferred_place") {
    pill.style.opacity = String(0.82 + (candidate.confidence ?? 0.5) * 0.18);
  }
  const thumbUrl = candidate.markerThumbnailUrl?.trim();
  if (thumbUrl) {
    prependGlobeDiscoveryPillThumbnail(pill, {
      thumbnailUrl: thumbUrl,
      fallbackGlyph: fallbackGlyph(candidate.family),
      showPlay:
        candidate.markerMediaKind === "video" ||
        resolveBrainSurfaceMarkerMediaKind({
          family: candidate.family,
          embedUrl: candidate.embedUrl,
        }) === "video",
    });
  }

  const badgeLabel =
    mapMarkerBadgeLabel(candidate) ?? familyCategoryLabel(candidate.family);
  if (badgeLabel) {
    const badge = document.createElement("span");
    badge.className = "rimvio-globe-lodging-marker__ontology-badge";
    badge.textContent = badgeLabel;
    pill.appendChild(badge);
  }

  const name = document.createElement("span");
  name.className = "rimvio-globe-lodging-marker__discovery-name";
  name.textContent = candidate.label;
  pill.appendChild(name);

  const detailLabel = mapMarkerDetailLabel(candidate);
  if (detailLabel) {
    const detail = document.createElement("span");
    detail.className = "rimvio-globe-lodging-marker__discovery-price";
    detail.textContent = detailLabel;
    pill.appendChild(detail);
  }

  return pill;
}

function buildCalloutStem(offsetX: number, offsetY: number): SVGSVGElement {
  const padding = 24;
  const minX = Math.min(0, offsetX) - padding;
  const minY = Math.min(0, offsetY) - padding;
  const maxX = Math.max(0, offsetX) + padding;
  const maxY = Math.max(0, offsetY) + padding;
  const width = maxX - minX;
  const height = maxY - minY;
  const startX = -minX;
  const startY = -minY;
  const endX = startX + offsetX;
  const endY = startY + offsetY;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "rimvio-globe-brain-surface-marker__stem");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.style.left = `${minX}px`;
  svg.style.top = `${minY}px`;

  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", String(startX));
  line.setAttribute("y1", String(startY));
  line.setAttribute("x2", String(endX));
  line.setAttribute("y2", String(endY));
  line.setAttribute("stroke", "rgba(255,255,255,0.42)");
  line.setAttribute("stroke-width", "1.5");
  line.setAttribute("stroke-linecap", "round");
  line.setAttribute("stroke-dasharray", "4 4");
  svg.appendChild(line);
  return svg;
}

export function createGlobeBrainSurfaceMarkerElement(
  candidate: BrainSurfaceProjectionCandidate,
  handlers: GlobeBrainSurfaceMarkerHandlers,
): HTMLElement {
  const root = document.createElement("button");
  root.type = "button";
  root.className = "rimvio-globe-lodging-marker rimvio-globe-brain-surface-marker";
  root.dataset.brainSurfaceCandidate = candidate.id;
  root.dataset.brainSurfaceFamily = candidate.family;
  root.dataset.brainSurfaceAccent = candidate.accent;
  root.dataset.discoveryAccent = candidate.accent;
  root.classList.add("rimvio-globe-lodging-marker--discovery");
  root.classList.add("rimvio-globe-lodging-marker--main");
  if (candidate.anchorKind) {
    root.dataset.brainSurfaceAnchorKind = candidate.anchorKind;
  }
  const baseZIndex =
    candidate.family === "media"
      ? 8
      : candidate.family === "trace_place"
        ? 7
        : candidate.family === "event"
          ? 6
          : 5;
  root.style.zIndex = String(baseZIndex + (candidate.zIndexBoost ?? 0));
  root.style.opacity = String(candidate.markerOpacity ?? 1);
  root.style.transform = `scale(${candidate.markerScale ?? 1})`;
  root.style.transformOrigin = "center bottom";
  root.style.transition =
    "left 280ms cubic-bezier(0.22, 1, 0.36, 1), top 280ms cubic-bezier(0.22, 1, 0.36, 1), transform 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease, filter 220ms ease";
  if (candidate.virtualCandidate) {
    root.dataset.virtualCandidate = "true";
  }

  const isStoryMarker = candidate.markerStyle === "story";
  if (isStoryMarker) {
    root.classList.add("rimvio-globe-brain-surface-marker--story");
    if ((candidate.focusPriority ?? 0) >= 100) {
      root.classList.add("rimvio-globe-brain-surface-marker--story-active");
    }
    root.appendChild(buildStoryThumbnail(candidate));
    const dot = document.createElement("span");
    dot.className = "rimvio-globe-lodging-marker__dot rimvio-globe-brain-surface-marker__story-dot";
    root.appendChild(dot);
    root.setAttribute("aria-label", candidate.label.trim() || candidate.placeLabel);
    root.addEventListener("pointerdown", (event) => event.stopPropagation());
    root.addEventListener("click", (event) => {
      event.stopPropagation();
      event.preventDefault();
      handlers.onPress(candidate.id);
    });
    return root;
  }

  const isTraceMarker = candidate.markerStyle === "trace";
  if (isTraceMarker) {
    root.classList.add("rimvio-globe-brain-surface-marker--trace");
    const label = document.createElement("span");
    label.className = "rimvio-globe-brain-surface-marker__trace-label";
    label.textContent = candidate.label.trim() || familyCategoryLabel(candidate.family);
    root.appendChild(label);
    const dot = document.createElement("span");
    dot.className =
      "rimvio-globe-lodging-marker__dot rimvio-globe-brain-surface-marker__trace-dot";
    if (candidate.anchorKind === "video_root") {
      dot.classList.add("rimvio-globe-brain-surface-marker__trace-dot--root");
    }
    root.appendChild(dot);
    root.setAttribute("aria-label", `${candidate.placeLabel} · ${candidate.label}`);
    root.addEventListener("pointerdown", (event) => event.stopPropagation());
    root.addEventListener("click", (event) => {
      event.stopPropagation();
      event.preventDefault();
      handlers.onPress(candidate.id);
    });
    return root;
  }

  const callout = readCalloutOffset(candidate);
  if (callout) {
    root.classList.add("rimvio-globe-brain-surface-marker--callout");
    root.style.setProperty("--callout-x", `${callout.x}px`);
    root.style.setProperty("--callout-y", `${callout.y}px`);
    root.style.zIndex = String(20 + indexZBoostFromCallout(callout));

    const field = document.createElement("span");
    field.className = "rimvio-globe-brain-surface-marker__callout-field";
    field.appendChild(buildCalloutStem(callout.x, callout.y));

    const pill = buildDiscoveryPill(candidate);
    pill.classList.add("rimvio-globe-brain-surface-marker__callout-pill");
    field.appendChild(pill);
    root.appendChild(field);
  } else {
    const pill = buildDiscoveryPill(candidate);
    root.appendChild(pill);
  }

  const dot = document.createElement("span");
  dot.className = "rimvio-globe-lodging-marker__dot";
  const markerStyle = candidate.markerStyle ?? "dashed";
  if (markerStyle === "dashed") {
    dot.style.borderStyle = "dashed";
  }
  root.appendChild(dot);

  if (!candidate.label.trim()) {
    const fallback = document.createElement("span");
    fallback.className = "rimvio-globe-lodging-marker__fallback";
    fallback.textContent = fallbackGlyph(candidate.family);
    root.appendChild(fallback);
  }

  root.setAttribute("aria-label", `${candidate.placeLabel} · ${candidate.label}`);
  root.addEventListener("pointerdown", (event) => event.stopPropagation());
  root.addEventListener("click", (event) => {
    event.stopPropagation();
    event.preventDefault();
    handlers.onPress(candidate.id);
  });
  return root;
}
