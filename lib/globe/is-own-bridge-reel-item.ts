import type { ContextMediaReelItem } from "@/lib/globe/project-context-media-reel";
import { isOwnBridgeCapture } from "@/lib/globe/bridge-context-media-reel-policy";

export function isOwnBridgeReelItem(input: {
  item: ContextMediaReelItem;
  viewerUserId?: string | null;
}): boolean {
  if (input.item.allowLocalBlob === true) {
    return true;
  }
  return isOwnBridgeCapture({
    capture: input.item,
    viewerUserId: input.viewerUserId,
  });
}
