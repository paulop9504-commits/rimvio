import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";

export function createGlobe3dPinElement(
  pin: ClassifiedGlobePin,
  active: boolean,
  onPress: (pinId: string) => void,
): HTMLElement {
  const root = document.createElement("button");
  root.type = "button";
  root.className = `rimvio-globe-3d-pin${active ? " rimvio-globe-3d-pin--active" : ""}`;
  root.setAttribute(
    "aria-label",
    pin.slot?.experienceTitle?.trim() || pin.label.trim() || "경험 핀",
  );

  const title = document.createElement("span");
  title.className = "rimvio-globe-3d-pin__title";
  title.textContent = pin.slot?.experienceTitle?.trim() || pin.label.trim() || "경험";
  root.appendChild(title);

  const meta = document.createElement("span");
  meta.className = "rimvio-globe-3d-pin__meta";
  meta.textContent = "경험";
  root.appendChild(meta);

  root.addEventListener("click", (event) => {
    event.stopPropagation();
    onPress(pin.id);
  });

  return root;
}
