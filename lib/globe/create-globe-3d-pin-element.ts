import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";

export function createGlobe3dPinElement(
  pin: ClassifiedGlobePin,
  active: boolean,
  onPress: (pinId: string) => void,
): HTMLElement {
  const root = document.createElement("button");
  root.type = "button";
  root.dataset.globePinId = pin.id;
  root.className = `rimvio-globe-3d-pin${active ? " rimvio-globe-3d-pin--active" : ""}`;
  root.setAttribute(
    "aria-label",
    pin.slot?.experienceTitle?.trim() || pin.label.trim() || "경험 핀",
  );

  const card = document.createElement("span");
  card.className = "rimvio-globe-3d-pin__card";

  const title = document.createElement("span");
  title.className = "rimvio-globe-3d-pin__title";
  title.textContent = pin.slot?.experienceTitle?.trim() || pin.label.trim() || "경험";
  card.appendChild(title);

  const meta = document.createElement("span");
  meta.className = "rimvio-globe-3d-pin__meta";
  meta.textContent = "경험";
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
