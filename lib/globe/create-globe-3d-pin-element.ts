import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";
import {
  feedSlotPeerChipGradientCss,
  feedSlotPeerChipShortLabel,
} from "@/lib/feed/feed-slot-peer-chip-colors";

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

export function createGlobe3dPinElement(
  pin: ClassifiedGlobePin,
  active: boolean,
  onPress: (pinId: string) => void,
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

  root.addEventListener("click", (event) => {
    event.stopPropagation();
    onPress(pin.id);
  });

  return root;
}
