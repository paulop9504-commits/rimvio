/**
 * Match Workspace Objects against FILTER_OBJECT changes (Instance attrs/tags only).
 */

import type { WorkspaceObject } from "@/lib/workspace/workspace-types";

function blobOf(obj: WorkspaceObject): string {
  return [
    obj.title,
    obj.kind,
    obj.priceLabelKo ?? "",
    ...obj.tags,
    String(obj.attrs.category ?? ""),
    String(obj.attrs.hotelType ?? ""),
    String(obj.attrs.stayType ?? ""),
  ]
    .join(" ")
    .toLowerCase();
}

export function objectMatchesCategory(
  obj: WorkspaceObject,
  category: string,
): boolean {
  const cat = category.trim().toLowerCase();
  if (!cat) return true;
  const blob = blobOf(obj);
  if (cat === "capsule") {
    return (
      obj.tags.some((t) => /capsule|stay:capsule|캡슐/i.test(t)) ||
      /capsule|캡슐/.test(blob) ||
      obj.attrs.category === "capsule" ||
      obj.attrs.hotelType === "capsule"
    );
  }
  if (cat === "cheap" || cat === "budget") {
    return (
      (obj.attrs.priceBand != null && Number(obj.attrs.priceBand) <= 2) ||
      /저렴|가성비|cheap|budget|hostel|호스텔/.test(blob)
    );
  }
  return (
    blob.includes(cat) ||
    obj.attrs.category === cat ||
    obj.attrs.hotelType === cat
  );
}

export function objectMatchesTargetKind(
  obj: WorkspaceObject,
  target: string,
): boolean {
  const t = target.trim().toLowerCase();
  if (!t || t === "workspace" || t === "*") return true;
  if (t === "hotel" || t === "lodging") return obj.kind === "hotel";
  if (t === "restaurant" || t === "eatery") return obj.kind === "restaurant";
  return obj.kind === t || obj.id === target;
}

/**
 * FILTER_OBJECT: keep matching target objects visible; hide non-matching targets.
 * Other kinds stay visible unless target is wildcard.
 */
export function applyFilterVisibility(
  objects: readonly WorkspaceObject[],
  target: string,
  changes: Readonly<Record<string, unknown>>,
): readonly WorkspaceObject[] {
  const category =
    typeof changes.category === "string"
      ? changes.category
      : typeof changes.hotelType === "string"
        ? changes.hotelType
        : null;
  const maxPriceBand =
    typeof changes.maxPriceBand === "number" ? changes.maxPriceBand : null;
  const nearLabel =
    typeof changes.near === "string"
      ? changes.near
      : typeof changes.stationNear === "string"
        ? changes.stationNear
        : null;

  const now = new Date().toISOString();
  return objects.map((obj) => {
    const inTarget = objectMatchesTargetKind(obj, target);
    if (!inTarget) {
      return obj;
    }
    let visible = true;
    if (category) {
      visible = objectMatchesCategory(obj, category);
    }
    if (visible && maxPriceBand != null) {
      const band = obj.attrs.priceBand;
      visible =
        band != null && Number.isFinite(Number(band))
          ? Number(band) <= maxPriceBand
          : /저렴|cheap|budget|가성비/i.test(blobOf(obj));
    }
    if (visible && nearLabel) {
      visible =
        blobOf(obj).includes(nearLabel.toLowerCase()) ||
        obj.tags.some((t) => t.toLowerCase().includes(nearLabel.toLowerCase())) ||
        Boolean(obj.attrs.stationNear);
    }
    if (obj.visible === visible) return obj;
    return { ...obj, visible, updatedAtIso: now };
  });
}
