/**
 * Mount autoplaying photo/video into a Workspace map marker host (MapLibre DOM).
 */

import type { WorkspaceMapContextMedia } from "@/lib/context-workspace/map/workspace-map-provider";
import { readMediaBlobUrl } from "@/lib/location-ping/media-blob-store";

const MEDIA_STYLE = [
  "width:100%",
  "height:100%",
  "object-fit:cover",
  "display:block",
  "pointer-events:none",
].join(";");

export async function resolveWorkspaceMediaSrc(
  media: WorkspaceMapContextMedia,
): Promise<string | null> {
  const remote = media.imageUrl?.trim() || "";
  if (remote) return remote;
  if (media.allowLocalBlob === true && media.mediaContextId?.trim()) {
    return readMediaBlobUrl(media.mediaContextId.trim());
  }
  return null;
}

/** Paint live media into host — video autoplays muted at the pin location. */
export function paintWorkspaceMediaAutoplay(
  host: HTMLElement,
  media: WorkspaceMapContextMedia,
  src: string | null,
): void {
  while (host.firstChild) {
    host.removeChild(host.firstChild);
  }

  if (!src) {
    host.style.background =
      media.kind === "video" ? "#191f28" : "#e8eef8";
    const fallback = document.createElement("span");
    fallback.textContent = media.kind === "video" ? "▶" : "🖼";
    fallback.style.cssText = [
      "position:absolute",
      "inset:0",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "font-size:18px",
      media.kind === "video" ? "color:#fff" : "color:#3182f6",
    ].join(";");
    host.appendChild(fallback);
    return;
  }

  if (media.kind === "video") {
    const video = document.createElement("video");
    video.src = src;
    video.autoplay = true;
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.setAttribute("muted", "");
    video.preload = "auto";
    video.style.cssText = MEDIA_STYLE;
    host.appendChild(video);
    void video.play().catch(() => {
      /* autoplay may be blocked until gesture — muted usually ok */
    });
    return;
  }

  const img = document.createElement("img");
  img.src = src;
  img.alt = "";
  img.draggable = false;
  img.style.cssText = MEDIA_STYLE;
  host.appendChild(img);
}

export async function hydrateWorkspaceMediaAutoplayHost(
  host: HTMLElement,
  media: WorkspaceMapContextMedia,
): Promise<void> {
  const src = await resolveWorkspaceMediaSrc(media);
  if (!host.isConnected) return;
  paintWorkspaceMediaAutoplay(host, media, src);
}
