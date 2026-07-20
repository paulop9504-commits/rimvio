import { GLOBE_DRAG_THRESHOLD_PX } from "@/lib/globe/globe-gesture-tuning";

/** Finger jitter before a press is treated as a globe drag (not a tap). */
export const GLOBE_MAP_TAP_MOVE_PX = Math.max(10, GLOBE_DRAG_THRESHOLD_PX * 5);

/**
 * Map marker press that does not steal pan/zoom.
 * OrbitControls receives pointerdown; a clean pointerup (no move) fires onPress.
 */
export function bindGlobeMapMarkerPress(
  root: HTMLElement,
  onPress: () => void,
): () => void {
  let pointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let moved = false;

  const onWindowMove = (event: PointerEvent) => {
    if (pointerId == null || event.pointerId !== pointerId) {
      return;
    }
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.hypot(dx, dy) > GLOBE_MAP_TAP_MOVE_PX) {
      moved = true;
    }
  };

  const onWindowUp = (event: PointerEvent) => {
    if (pointerId == null || event.pointerId !== pointerId) {
      return;
    }
    const wasMoved = moved;
    pointerId = null;
    window.removeEventListener("pointermove", onWindowMove);
    window.removeEventListener("pointerup", onWindowUp);
    window.removeEventListener("pointercancel", onWindowUp);
    if (!wasMoved) {
      event.stopPropagation();
      event.preventDefault();
      onPress();
    }
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || pointerId != null) {
      return;
    }
    // Do not stopPropagation — pan/zoom must start even when the finger
    // lands on a marker. Tap is decided on pointerup.
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    moved = false;
    window.addEventListener("pointermove", onWindowMove, { passive: true });
    window.addEventListener("pointerup", onWindowUp, { passive: false });
    window.addEventListener("pointercancel", onWindowUp, { passive: false });
  };

  root.addEventListener("pointerdown", onPointerDown, { passive: true });

  // Suppress native click after we handled a tap (or after a drag).
  const onClick = (event: MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
  };
  root.addEventListener("click", onClick);

  return () => {
    root.removeEventListener("pointerdown", onPointerDown);
    root.removeEventListener("click", onClick);
    window.removeEventListener("pointermove", onWindowMove);
    window.removeEventListener("pointerup", onWindowUp);
    window.removeEventListener("pointercancel", onWindowUp);
  };
}
