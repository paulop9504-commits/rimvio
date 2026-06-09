/** Live viewer position — pulsing dot, not an experience pin. */
export function createGlobe3dViewerPinElement(): HTMLElement {
  const root = document.createElement("div");
  root.className = "rimvio-globe-3d-viewer-pin";
  root.setAttribute("aria-label", "현재 위치");
  root.dataset.globeViewerPin = "true";

  const ring = document.createElement("span");
  ring.className = "rimvio-globe-3d-viewer-pin__ring";
  ring.setAttribute("aria-hidden", "true");

  const dot = document.createElement("span");
  dot.className = "rimvio-globe-3d-viewer-pin__dot";
  dot.setAttribute("aria-hidden", "true");

  root.appendChild(ring);
  root.appendChild(dot);
  return root;
}
