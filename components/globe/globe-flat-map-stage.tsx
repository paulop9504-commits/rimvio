"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ComponentType,
  type Ref,
} from "react";
import maplibregl from "maplibre-gl";
import type { Map as MLMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { buildMapHubPortalMarkers } from "@/lib/experience-run/build-map-hub-portal-markers";
import { pinGlyph } from "@/lib/globe/pin-glyph";
import type { GpsPing } from "@/lib/gps/storage";
import { cn } from "@/lib/utils";
import type { GlobeFlatMapHandle } from "@/types/globe-map";

const OSM_VECTOR_STYLE = {
  version: 8 as const,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    osm: {
      type: "raster" as const,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster" as const, source: "osm" }],
};

const SEOUL: [number, number] = [126.9784, 37.5665];

function createClusterElement() {
  const wrap = document.createElement("div");
  wrap.style.cssText = "pointer-events:auto;cursor:pointer";
  const el = document.createElement("div");
  el.style.cssText = [
    "width:28px;height:28px;border-radius:50%;",
    "background:hsl(25 62% 42%);border:2.5px solid #fff;",
    "box-shadow:0 2px 8px rgba(0,0,0,0.28);",
  ].join("");
  wrap.appendChild(el);
  return { wrap, el };
}

function createHubPortalMarkerElement() {
  const wrap = document.createElement("div");
  wrap.style.cssText = "pointer-events:auto;cursor:pointer";
  wrap.dataset.mapHubPortal = "1";
  const el = document.createElement("div");
  el.textContent = "◎";
  el.style.cssText = [
    "width:32px;height:32px;border-radius:50%;",
    "background:#eef2ff;border:2.5px solid #6366f1;",
    "color:#4338ca;font-size:15px;font-weight:700;",
    "display:flex;align-items:center;justify-content:center;",
    "box-shadow:0 2px 10px rgba(67,56,202,0.28);",
  ].join("");
  wrap.appendChild(el);
  return { wrap, el };
}

function createPinMarkerElement(kind: string, index: number | null) {
  const wrap = document.createElement("div");
  wrap.style.cssText = "pointer-events:auto;cursor:pointer";
  wrap.className = "globe-map-pin-marker";
  const el = document.createElement("div");
  wrap.appendChild(el);
  el.textContent = pinGlyph(kind, index);
  el.className = "globe-map-pin-marker__glyph";
  el.style.cssText = [
    "width:32px;height:32px;border-radius:50%;",
    "background:#34c759;border:2.5px solid #fff;",
    "color:#fff;font-size:12px;font-weight:700;",
    "display:flex;align-items:center;justify-content:center;",
    "box-shadow:0 2px 10px rgba(0,0,0,0.22);",
  ].join("");
  return { wrap, el };
}

export type GlobeFlatMapStageProps = {
  /** WebGL unavailable (e.g. MapLibre init failed) — show notice, do not crash. */
  webglUnavailable?: boolean;
  /** When pinch zoom settles below this value, call `onDiscover`. */
  discoverZoomThreshold?: number;
  /** Called once when user zooms out enough for discovery shell. */
  onDiscover?: () => void;
  /** Show guidance under flat map chips (personal trace mode). */
  showDiscoverHint?: boolean;
  discoverHint?: string;
  clusters: Array<{
    id: string;
    kind: string;
    lat: number;
    lng: number;
    count: number;
    pinIndex: number | null;
  }>;
  scanned?: GpsPing[];
  onClusterClick?: (id: string) => void;
  reveal?: boolean;
};

function flattenRefHandle<T>(
  forwarded: Ref<T> | undefined
): ((instance: T | null) => void) | RefObject<T | null> | null | undefined {
  if (typeof forwarded === "function") return forwarded;
  return forwarded ?? undefined;
}

type RefObject<T> = { current: T | null };

function GlobeFlatMapStageInner(
  {
    webglUnavailable = false,
    discoverZoomThreshold = 9,
    onDiscover,
    showDiscoverHint = false,
    discoverHint = "",
    clusters,
    scanned = [],
    onClusterClick,
    reveal = true,
  }: GlobeFlatMapStageProps,
  forwardedRef: Ref<GlobeFlatMapHandle>
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const hubMarkersRef = useRef<maplibregl.Marker[]>([]);
  const selfMarkerRef = useRef<maplibregl.Marker | null>(null);
  const scannedMarkersRef = useRef<maplibregl.Marker[]>([]);
  const discoverNotifiedRef = useRef(false);
  const onDiscoverRef = useRef(onDiscover);
  const onClusterClickRef = useRef(onClusterClick);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    onDiscoverRef.current = onDiscover;
  }, [onDiscover]);

  useEffect(() => {
    onClusterClickRef.current = onClusterClick;
  }, [onClusterClick]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || webglUnavailable) {
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_VECTOR_STYLE as maplibregl.StyleSpecification,
      center: SEOUL,
      zoom: 11,
      attributionControl: { compact: true },
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => setMapReady(true));
    map.on("zoomend", () => {
      if (
        discoverNotifiedRef.current ||
        !onDiscoverRef.current ||
        map.getZoom() >= discoverZoomThreshold
      ) {
        return;
      }
      discoverNotifiedRef.current = true;
      onDiscoverRef.current();
    });

    mapRef.current = map;
    return () => {
      setMapReady(false);
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      hubMarkersRef.current.forEach((marker) => marker.remove());
      hubMarkersRef.current = [];
      selfMarkerRef.current?.remove();
      selfMarkerRef.current = null;
      scannedMarkersRef.current.forEach((marker) => marker.remove());
      scannedMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [discoverZoomThreshold, webglUnavailable]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) {
      return;
    }

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    for (const cluster of clusters) {
      const { wrap } = createPinMarkerElement(cluster.kind, cluster.pinIndex);
      const marker = new maplibregl.Marker({ element: wrap })
        .setLngLat([cluster.lng, cluster.lat])
        .addTo(map);
      marker.getElement().addEventListener("click", (event) => {
        event.stopPropagation();
        onClusterClickRef.current?.(cluster.id);
      });
      markersRef.current.push(marker);
    }
  }, [clusters, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) {
      return;
    }

    hubMarkersRef.current.forEach((marker) => marker.remove());
    hubMarkersRef.current = [];

    for (const hub of buildMapHubPortalMarkers()) {
      const { wrap } = createHubPortalMarkerElement();
      const marker = new maplibregl.Marker({ element: wrap })
        .setLngLat([hub.lng, hub.lat])
        .addTo(map);
      hubMarkersRef.current.push(marker);
    }
  }, [mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) {
      return;
    }

    scannedMarkersRef.current.forEach((marker) => marker.remove());
    scannedMarkersRef.current = [];

    for (const ping of scanned) {
      const { wrap } = createClusterElement();
      const marker = new maplibregl.Marker({ element: wrap })
        .setLngLat([ping.lng, ping.lat])
        .addTo(map);
      scannedMarkersRef.current.push(marker);
    }
  }, [mapReady, scanned]);

  useImperativeHandle(
    forwardedRef,
    () => ({
      flyToPin: (lat, lng, _level, options) => {
        const map = mapRef.current;
        if (!map) {
          return;
        }
        const zoom = map.getZoom() < 13 ? 14 : map.getZoom();
        const opts = options as { pinViewportY?: number } | undefined;
        const pinViewportY =
          typeof opts?.pinViewportY === "number" && opts.pinViewportY >= 0.2 && opts.pinViewportY <= 0.8
            ? opts.pinViewportY
            : undefined;
        map.easeTo({
          center: [lng, lat],
          zoom,
          duration: 550,
          ...(pinViewportY != null
            ? { offset: [0, (pinViewportY - 0.5) * (map.getCanvas().clientHeight || 0)] }
            : {}),
        });
      },
      setSelfPosition: (lat, lng) => {
        const map = mapRef.current;
        if (!map) {
          return;
        }
        if (!selfMarkerRef.current) {
          const el = document.createElement("div");
          el.style.cssText =
            "width:14px;height:14px;border-radius:50%;background:#007aff;border:2px solid #fff;box-shadow:0 0 0 4px rgba(0,122,255,0.35)";
          selfMarkerRef.current = new maplibregl.Marker({ element: el })
            .setLngLat([lng, lat])
            .addTo(map);
        } else {
          selfMarkerRef.current.setLngLat([lng, lat]);
        }
      },
      orientNorthUp: () => {
        mapRef.current?.easeTo({ bearing: 0, pitch: 0, duration: 400 });
      },
      /** Flat OSM — no terrain tilt in MVP. */
      tiltForLodgingFocus: () => {},
    }),
    []
  );

  if (webglUnavailable) {
    return (
      <div className="flex min-h-[280px] flex-1 items-center justify-center rounded-[1.25rem] bg-[#eef1f4] px-6 text-center text-sm text-[#6b7684]">
        지도를 이 기기에서 띄울 수 없어요
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className="relative min-h-0 flex-1"
      data-globe-view-mode="flat-osm"
      data-testid="globe-flat-map"
    >
      <div
        ref={containerRef}
        className={cn(
          "absolute inset-0 transition-[opacity,filter] duration-500",
          reveal ? "opacity-100 blur-none" : "opacity-[0.92] blur-[1px]"
        )}
      />
      {showDiscoverHint && discoverHint ? (
        <p className="pointer-events-none absolute inset-x-0 bottom-[max(3.25rem,env(safe-area-inset-bottom))] z-10 mx-auto w-fit rounded-full rimvio-globe-hint--toss px-3.5 py-1.5 text-[11px] font-medium backdrop-blur-md">
          {discoverHint}
        </p>
      ) : null}
    </div>
  );
}

export const GlobeFlatMapStage = forwardRef(GlobeFlatMapStageInner) as ComponentType<
  GlobeFlatMapStageProps & { ref?: Ref<GlobeFlatMapHandle> }
>;
