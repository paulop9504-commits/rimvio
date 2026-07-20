import type { GlobeContextHubMapAnchor } from "@/lib/globe/context-hub/context-hub-globe-anchor-types";
import { bindGlobeMapMarkerPress } from "@/lib/globe/bind-globe-map-marker-press";

export type GlobeContextHubAnchorHandlers = {
  onPress: (contextEventId: string) => void;
};

export function createGlobeContextHubAnchorElement(
  anchor: GlobeContextHubMapAnchor,
  handlers: GlobeContextHubAnchorHandlers,
): HTMLElement {
  const root = document.createElement("button");
  root.type = "button";
  root.className = "rimvio-globe-context-hub-anchor";
  root.dataset.globeContextHubAnchor = anchor.contextEventId;
  root.setAttribute("aria-label", anchor.label);

  const pill = document.createElement("span");
  pill.className = "rimvio-globe-context-hub-anchor__pill";

  const icon = document.createElement("span");
  icon.className = "rimvio-globe-context-hub-anchor__icon";
  icon.textContent = "◆";
  icon.setAttribute("aria-hidden", "true");

  const label = document.createElement("span");
  label.className = "rimvio-globe-context-hub-anchor__label";
  label.textContent = anchor.shortLabel;

  pill.appendChild(icon);
  pill.appendChild(label);
  root.appendChild(pill);

  const tail = document.createElement("span");
  tail.className = "rimvio-globe-context-hub-anchor__tail";
  root.appendChild(tail);

  bindGlobeMapMarkerPress(root, () => {
    handlers.onPress(anchor.contextEventId);
  });

  return root;
}
