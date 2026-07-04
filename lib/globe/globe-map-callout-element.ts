export type GlobeMapCalloutOffset = {
  x: number;
  y: number;
};

export function readGlobeMapCalloutOffset(input: {
  calloutOffsetX?: number | null;
  calloutOffsetY?: number | null;
}): GlobeMapCalloutOffset | null {
  const x = input.calloutOffsetX;
  const y = input.calloutOffsetY;
  if (x == null || y == null || !Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }
  if (x === 0 && y === 0) {
    return null;
  }
  return { x, y };
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
  line.setAttribute("stroke", "rgba(15, 23, 42, 0.22)");
  line.setAttribute("stroke-width", "1.5");
  line.setAttribute("stroke-linecap", "round");
  line.setAttribute("stroke-dasharray", "4 4");
  svg.appendChild(line);
  return svg;
}

/** Radial callout wrapper — shared by lodging, eatery, brain surface pills. */
export function mountGlobeMapCalloutPill(
  root: HTMLElement,
  pill: HTMLElement,
  offset: GlobeMapCalloutOffset,
): void {
  root.classList.add(
    "rimvio-globe-brain-surface-marker",
    "rimvio-globe-brain-surface-marker--callout",
  );
  root.style.setProperty("--callout-x", `${offset.x}px`);
  root.style.setProperty("--callout-y", `${offset.y}px`);

  const field = document.createElement("span");
  field.className = "rimvio-globe-brain-surface-marker__callout-field";
  field.appendChild(buildCalloutStem(offset.x, offset.y));
  pill.classList.add("rimvio-globe-brain-surface-marker__callout-pill");
  field.appendChild(pill);
  root.appendChild(field);
}
