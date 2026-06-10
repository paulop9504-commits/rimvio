import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";
import {
  feedSlotPeerChipGradientCss,
  feedSlotPeerChipShortLabel,
} from "@/lib/feed/feed-slot-peer-chip-colors";

const LONG_PRESS_MS = 520;
const MOVE_CANCEL_PX = 10;

export type Globe3dPinInteractionHandlers = {
  onPress: (pinId: string) => void;
  onRelocateStart?: (pinId: string) => void;
};

function appendPeerRow(card: HTMLElement, pin: ClassifiedGlobePin): void {
  const peers = pin.peers ?? [];
  if (peers.length === 0) {
    return;
  }

  const row = document.createElement("span");
  row.className = "rimvio-globe-3d-pin__peers";

  const avatars = document.createElement("span");
  avatars.className = "rimvio-globe-3d-pin__peer-avatars";
  avatars.setAttribute("aria-hidden", "true");

  for (const peer of peers.slice(0, 3)) {
    const avatar = document.createElement("span");
    avatar.className = "rimvio-globe-3d-pin__peer-avatar";
    avatar.title = peer.displayName;

    if (peer.avatarUrl) {
      const image = document.createElement("img");
      image.src = peer.avatarUrl;
      image.alt = "";
      image.className = "rimvio-globe-3d-pin__peer-avatar-img";
      avatar.appendChild(image);
    } else {
      avatar.style.background = feedSlotPeerChipGradientCss(peer.peerThreadId);
      avatar.textContent = feedSlotPeerChipShortLabel(peer.displayName);
    }

    avatars.appendChild(avatar);
  }

  row.appendChild(avatars);

  const names = document.createElement("span");
  names.className = "rimvio-globe-3d-pin__peer-names";
  names.textContent = peers.map((peer) => peer.displayName).join(" · ");
  row.appendChild(names);

  card.appendChild(row);
}

function canRelocatePin(
  pin: ClassifiedGlobePin,
  relocateEnabled: boolean,
): boolean {
  return (
    relocateEnabled &&
    pin.pinShape !== "viewer" &&
    pin.pinShape !== "cluster" &&
    Boolean(pin.sourceEventId?.trim())
  );
}

export function createGlobe3dClusterPinElement(
  pin: ClassifiedGlobePin,
  onPress: (pinId: string) => void,
): HTMLElement {
  const root = document.createElement("button");
  root.type = "button";
  root.dataset.globePinId = pin.id;
  root.className = "rimvio-globe-3d-pin rimvio-globe-3d-pin--cluster";
  root.setAttribute("aria-label", pin.label);

  const card = document.createElement("span");
  card.className = "rimvio-globe-3d-pin__card rimvio-globe-3d-pin__card--cluster";

  const count = document.createElement("span");
  count.className = "rimvio-globe-3d-pin__cluster-count";
  count.textContent = pin.slot?.experienceTitle?.trim() || pin.label;
  card.appendChild(count);

  const meta = document.createElement("span");
  meta.className = "rimvio-globe-3d-pin__meta";
  meta.textContent = "맥락";
  card.appendChild(meta);

  root.appendChild(card);

  const dot = document.createElement("span");
  dot.className = "rimvio-globe-3d-pin__dot";
  dot.setAttribute("aria-hidden", "true");
  root.appendChild(dot);

  root.addEventListener("click", (event) => {
    event.stopPropagation();
    onPress(pin.id);
  });

  return root;
}

export function createGlobe3dPinElement(
  pin: ClassifiedGlobePin,
  active: boolean,
  handlers: Globe3dPinInteractionHandlers,
  options?: { relocateEnabled?: boolean },
): HTMLElement {
  const root = document.createElement("button");
  root.type = "button";
  root.dataset.globePinId = pin.id;
  root.className = `rimvio-globe-3d-pin${pin.tripLeg === "departure" ? " rimvio-globe-3d-pin--departure" : ""}${active ? " rimvio-globe-3d-pin--active" : ""}`;
  const peerLabel = pin.peers?.map((peer) => peer.displayName).join(", ");
  root.setAttribute(
    "aria-label",
    [
      pin.slot?.experienceTitle?.trim() || pin.label.trim() || "경험 핀",
      peerLabel ? `함께한 사람 ${peerLabel}` : null,
      canRelocatePin(pin, options?.relocateEnabled !== false)
        ? "길게 눌러 위치 이동"
        : null,
    ]
      .filter(Boolean)
      .join(" · "),
  );

  const card = document.createElement("span");
  card.className = "rimvio-globe-3d-pin__card";

  const title = document.createElement("span");
  title.className = "rimvio-globe-3d-pin__title";
  title.textContent = pin.slot?.experienceTitle?.trim() || pin.label.trim() || "경험";
  card.appendChild(title);

  appendPeerRow(card, pin);

  const meta = document.createElement("span");
  meta.className = "rimvio-globe-3d-pin__meta";
  meta.textContent =
    pin.tripLeg === "departure"
      ? "출발"
      : pin.tripLeg === "destination"
        ? "도착"
        : "경험";
  card.appendChild(meta);

  root.appendChild(card);

  const dot = document.createElement("span");
  dot.className = "rimvio-globe-3d-pin__dot";
  dot.setAttribute("aria-hidden", "true");
  root.appendChild(dot);

  const relocateEnabled = canRelocatePin(pin, options?.relocateEnabled !== false);

  if (!relocateEnabled || !handlers.onRelocateStart) {
    root.addEventListener("click", (event) => {
      event.stopPropagation();
      handlers.onPress(pin.id);
    });
    return root;
  }

  let longPressTimer: number | null = null;
  let longPressActive = false;
  let suppressTap = false;
  let startX = 0;
  let startY = 0;

  const clearTimer = () => {
    if (longPressTimer !== null) {
      window.clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  };

  root.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }
    suppressTap = false;
    longPressActive = false;
    startX = event.clientX;
    startY = event.clientY;
    clearTimer();
    root.setPointerCapture(event.pointerId);
    longPressTimer = window.setTimeout(() => {
      longPressActive = true;
      suppressTap = true;
      root.classList.add("rimvio-globe-3d-pin--relocating");
      root.setAttribute("data-globe-pin-relocating", "true");
      handlers.onRelocateStart?.(pin.id);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(12);
      }
    }, LONG_PRESS_MS);
  });

  root.addEventListener("pointermove", (event) => {
    if (longPressActive) {
      event.stopPropagation();
      event.preventDefault();
      return;
    }
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) {
      clearTimer();
    }
  });

  const finishPointer = (event: PointerEvent) => {
    clearTimer();
    if (root.hasPointerCapture(event.pointerId)) {
      root.releasePointerCapture(event.pointerId);
    }
    if (longPressActive) {
      event.stopPropagation();
      event.preventDefault();
      root.classList.remove("rimvio-globe-3d-pin--relocating");
      root.removeAttribute("data-globe-pin-relocating");
      longPressActive = false;
      return;
    }
    if (!suppressTap) {
      event.stopPropagation();
      handlers.onPress(pin.id);
    }
    suppressTap = false;
  };

  root.addEventListener("pointerup", finishPointer);
  root.addEventListener("pointercancel", finishPointer);

  return root;
}
