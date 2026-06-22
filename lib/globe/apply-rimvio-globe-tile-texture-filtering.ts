import type { Object3D, Texture } from "three";
import {
  LinearFilter,
  LinearMipMapLinearFilter,
  Mesh,
} from "three";
import { isAndroid } from "@/lib/platform/device";

const FILTER_FLAG = "__rimvioTileFiltered";

/** Smoother slippy tiles — runs once per texture (not every zoom frame). */
export function applyRimvioGlobeTileTextureFiltering(root: Object3D): void {
  const useMipmaps = !isAndroid();
  root.traverse((node) => {
    if (!(node instanceof Mesh)) {
      return;
    }
    const material = node.material;
    const materials = Array.isArray(material) ? material : [material];
    for (const row of materials) {
      const map = (row as { map?: Texture | null }).map;
      if (!map || (map.userData as Record<string, boolean>)[FILTER_FLAG]) {
        continue;
      }
      map.minFilter = useMipmaps ? LinearMipMapLinearFilter : LinearFilter;
      map.magFilter = LinearFilter;
      map.anisotropy = Math.min(useMipmaps ? 4 : 2, map.anisotropy || (useMipmaps ? 4 : 2));
      map.needsUpdate = true;
      (map.userData as Record<string, boolean>)[FILTER_FLAG] = true;
    }
  });
}
