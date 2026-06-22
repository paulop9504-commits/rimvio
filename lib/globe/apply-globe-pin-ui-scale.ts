/** Push zoom scale onto globe.gl HTML pin nodes — CSS var only (no DOM walk). */
export function applyGlobePinUiScale(root: ParentNode, scale: number): void {
  const cardScale = scale.toFixed(4);
  if (root instanceof HTMLElement) {
    root.style.setProperty("--globe-pin-scale", cardScale);
    root.style.setProperty(
      "--globe-pin-dot-scale",
      Math.max(0.28, Math.min(1, scale * 1.08)).toFixed(4),
    );
  }
}
