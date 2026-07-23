"use client";

/**
 * Context Workspace 2D map — MapLibre (sharp) by default.
 * Separate surface from 3D Globe — no hybrid handoff.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  initAppleMapKitWithToken,
} from "@/lib/context-workspace/map/load-apple-mapkit";
import {
  isAppleMapKitWorkspaceEnabled,
  isMapLibreWorkspaceEnabled,
  type WorkspaceMapPin,
} from "@/lib/context-workspace/map/workspace-map-provider";
import { GLOBE_VECTOR_MAP_STYLE_URL } from "@/lib/globe/globe-vector-map-view";
import { applyRimvioVectorMapCanvas } from "@/lib/globe/apply-rimvio-vector-map-canvas";
import {
  bindGlobeVectorMapResize,
  syncGlobeVectorMapSize,
} from "@/lib/globe/sync-globe-vector-map-size";
import { cn } from "@/lib/utils";

export type WorkspaceMapViewProps = {
  pins: readonly WorkspaceMapPin[];
  selectedId?: string | null;
  onSelectPin?: (id: string) => void;
  onBackgroundActivate?: () => void;
  className?: string;
  compact?: boolean;
};

function formatRating(rating: number | null | undefined): string {
  if (rating == null || !Number.isFinite(rating)) {
    return "—";
  }
  return rating.toFixed(1);
}

function pinBounds(pins: readonly WorkspaceMapPin[]) {
  const visible = pins.filter(
    (n) => Number.isFinite(n.lat) && Number.isFinite(n.lng),
  );
  if (visible.length === 0) {
    return null;
  }
  let minLat = visible[0]!.lat;
  let maxLat = visible[0]!.lat;
  let minLng = visible[0]!.lng;
  let maxLng = visible[0]!.lng;
  for (const n of visible) {
    minLat = Math.min(minLat, n.lat);
    maxLat = Math.max(maxLat, n.lat);
    minLng = Math.min(minLng, n.lng);
    maxLng = Math.max(maxLng, n.lng);
  }
  const padLat = Math.max((maxLat - minLat) * 0.18, 0.012);
  const padLng = Math.max((maxLng - minLng) * 0.18, 0.012);
  return {
    minLat: minLat - padLat,
    maxLat: maxLat + padLat,
    minLng: minLng - padLng,
    maxLng: maxLng + padLng,
    centerLat: (minLat + maxLat) / 2,
    centerLng: (minLng + maxLng) / 2,
  };
}

function PlaceholderPinMap({
  pins,
  selectedId,
  onSelectPin,
  onBackgroundActivate,
  compact,
}: WorkspaceMapViewProps) {
  const visible = pins.filter(
    (n) => Number.isFinite(n.lat) && Number.isFinite(n.lng),
  );
  const bounds = useMemo(() => pinBounds(visible), [visible]);

  if (!bounds || visible.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-sky-50 text-[12px] text-muted-foreground">
        지도를 펼쳐 보세요
      </div>
    );
  }

  const spanLat = bounds.maxLat - bounds.minLat || 1;
  const spanLng = bounds.maxLng - bounds.minLng || 1;
  const Shell = onBackgroundActivate ? "button" : "div";

  return (
    <Shell
      type={onBackgroundActivate ? "button" : undefined}
      className={cn(
        "relative h-full w-full overflow-hidden bg-[radial-gradient(ellipse_at_30%_20%,#bfdbfe_0%,transparent_55%),radial-gradient(ellipse_at_70%_75%,#a7f3d0_0%,transparent_50%),linear-gradient(165deg,#e0f2fe,#ecfdf5)]",
        onBackgroundActivate && "cursor-pointer text-left",
      )}
      onClick={onBackgroundActivate}
    >
      {visible.map((node, index) => {
        const x = ((node.lng - bounds.minLng) / spanLng) * 100;
        const y = (1 - (node.lat - bounds.minLat) / spanLat) * 100;
        const active = node.id === selectedId || node.selected;
        return (
          <button
            key={node.id}
            type="button"
            className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            style={{ left: `${x}%`, top: `${y}%` }}
            onClick={(event) => {
              event.stopPropagation();
              onSelectPin?.(node.id);
            }}
            aria-label={node.title}
          >
            {compact ? (
              <>
                <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold shadow-sm ring-1 ring-black/10">
                  ★ {formatRating(node.rating)}
                </span>
                <span className="mt-0.5 max-w-[72px] truncate rounded bg-black/55 px-1 py-px text-[9px] text-white">
                  {node.title}
                </span>
              </>
            ) : (
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold shadow-sm",
                  active
                    ? "bg-orange-500 text-white ring-2 ring-white"
                    : "bg-white/95 text-foreground ring-1 ring-black/10",
                )}
              >
                {index + 1}
              </span>
            )}
          </button>
        );
      })}
    </Shell>
  );
}

function MapLibreWorkspaceMap({
  pins,
  selectedId,
  onSelectPin,
  onBackgroundActivate,
  compact,
  className,
}: WorkspaceMapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const markersRef = useRef<import("maplibre-gl").Marker[]>([]);
  const onSelectRef = useRef(onSelectPin);
  const onBgRef = useRef(onBackgroundActivate);
  onSelectRef.current = onSelectPin;
  onBgRef.current = onBackgroundActivate;
  const [ready, setReady] = useState(false);
  const bounds = useMemo(() => pinBounds(pins), [pins]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    let cancelled = false;
    let map: import("maplibre-gl").Map | null = null;
    let unbindResize: (() => void) | null = null;

    void (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      await import("maplibre-gl/dist/maplibre-gl.css");
      if (cancelled || !containerRef.current) {
        return;
      }
      const center = bounds
        ? ([bounds.centerLng, bounds.centerLat] as [number, number])
        : ([126.5312, 33.4996] as [number, number]);
      map = new maplibregl.Map({
        container: containerRef.current,
        style: GLOBE_VECTOR_MAP_STYLE_URL,
        center,
        zoom: compact ? 12.2 : 13.6,
        attributionControl: false,
        maxZoom: 19,
        minZoom: 10,
        fadeDuration: 0,
        pitch: 0,
        bearing: 0,
      });
      mapRef.current = map;
      unbindResize = bindGlobeVectorMapResize(map, containerRef.current);
      map.on("load", () => {
        if (cancelled || !map) {
          return;
        }
        applyRimvioVectorMapCanvas(map);
        syncGlobeVectorMapSize(map, containerRef.current!);
        if (bounds) {
          map.fitBounds(
            [
              [bounds.minLng, bounds.minLat],
              [bounds.maxLng, bounds.maxLat],
            ],
            { padding: compact ? 28 : 56, maxZoom: compact ? 14 : 16, duration: 0 },
          );
        }
        setReady(true);
      });
      map.on("click", (event) => {
        if ((event.originalEvent.target as HTMLElement | null)?.closest?.(
          ".maplibregl-marker",
        )) {
          return;
        }
        onBgRef.current?.();
      });
    })();

    return () => {
      cancelled = true;
      unbindResize?.();
      for (const marker of markersRef.current) {
        marker.remove();
      }
      markersRef.current = [];
      map?.remove();
      mapRef.current = null;
      setReady(false);
    };
    // Mount once per compact mode — pins update in separate effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compact]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) {
      return;
    }
    void (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      for (const marker of markersRef.current) {
        marker.remove();
      }
      markersRef.current = [];
      const visible = pins.filter(
        (n) => Number.isFinite(n.lat) && Number.isFinite(n.lng),
      );
      for (const [index, pin] of visible.entries()) {
        const el = document.createElement("button");
        el.type = "button";
        el.className = cn(
          "flex items-center justify-center rounded-full border-0 shadow-md",
          compact ? "h-7 min-w-7 px-1.5 text-[10px]" : "h-8 min-w-8 px-2 text-[11px]",
          "font-semibold",
          pin.id === selectedId || pin.selected
            ? "bg-orange-500 text-white ring-2 ring-white"
            : "bg-white text-foreground ring-1 ring-black/10",
        );
        el.textContent = compact
          ? `★${formatRating(pin.rating)}`
          : String(index + 1);
        el.title = pin.title;
        el.addEventListener("click", (event) => {
          event.stopPropagation();
          onSelectRef.current?.(pin.id);
        });
        const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([pin.lng, pin.lat])
          .addTo(map);
        markersRef.current.push(marker);
      }
      const nextBounds = pinBounds(visible);
      if (nextBounds && visible.length > 0) {
        map.fitBounds(
          [
            [nextBounds.minLng, nextBounds.minLat],
            [nextBounds.maxLng, nextBounds.maxLat],
          ],
          {
            padding: compact ? 28 : 56,
            maxZoom: compact ? 14.5 : 16.5,
            duration: 420,
          },
        );
      }
    })();
  }, [ready, pins, selectedId, compact]);

  return (
    <div
      className={cn("relative h-full w-full overflow-hidden bg-[#e8eef3]", className)}
      data-workspace-maplibre
    >
      <div ref={containerRef} className="h-full w-full" />
      {!ready ? (
        <div className="pointer-events-none absolute inset-0">
          <PlaceholderPinMap
            pins={pins}
            selectedId={selectedId}
            compact={compact}
          />
        </div>
      ) : null}
      {!compact ? (
        <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-white/92 px-2 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm ring-1 ring-black/5">
          2D 작업장 · 선명 확대
        </span>
      ) : null}
    </div>
  );
}

type MapKitMapHandle = {
  destroy: () => void;
  showItems: (items: unknown[]) => void;
  removeItems?: (items: unknown[]) => void;
};

function AppleMapKitWorkspaceMap(props: WorkspaceMapViewProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapKitMapHandle | null>(null);
  const annotationsRef = useRef<unknown[]>([]);
  const [mapkitLive, setMapkitLive] = useState(false);
  const onSelectPinRef = useRef(props.onSelectPin);
  onSelectPinRef.current = props.onSelectPin;

  useEffect(() => {
    if (props.compact) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const ok = await initAppleMapKitWithToken();
      if (cancelled || !ok || !window.mapkit || !hostRef.current) {
        return;
      }
      try {
        const map = new window.mapkit.Map(hostRef.current, {
          isZoomEnabled: true,
          isScrollEnabled: true,
        }) as MapKitMapHandle;
        mapRef.current = map;
        setMapkitLive(true);
      } catch {
        setMapkitLive(false);
      }
    })();
    return () => {
      cancelled = true;
      try {
        mapRef.current?.destroy();
      } catch {
        // ignore
      }
      mapRef.current = null;
      setMapkitLive(false);
    };
  }, [props.compact]);

  useEffect(() => {
    if (!mapkitLive || !window.mapkit || !mapRef.current) {
      return;
    }
    const mapkit = window.mapkit;
    const map = mapRef.current;
    const pins = props.pins.filter(
      (n) => Number.isFinite(n.lat) && Number.isFinite(n.lng),
    );
    if (annotationsRef.current.length && map.removeItems) {
      try {
        map.removeItems(annotationsRef.current);
      } catch {
        // ignore
      }
    }
    const annotations = pins.map((pin) => {
      const coord = new mapkit.Coordinate(pin.lat, pin.lng);
      const marker = new mapkit.MarkerAnnotation(coord, {
        title: pin.title,
        color: pin.id === props.selectedId ? "#f97316" : "#0f172a",
      }) as {
        addEventListener?: (type: string, fn: () => void) => void;
      };
      marker.addEventListener?.("select", () => {
        onSelectPinRef.current?.(pin.id);
      });
      return marker;
    });
    annotationsRef.current = annotations;
    map.showItems(annotations);
  }, [mapkitLive, props.pins, props.selectedId]);

  if (props.compact || !mapkitLive) {
    return (
      <div className={cn("h-full w-full", props.className)}>
        <div
          ref={hostRef}
          className="invisible absolute inset-0"
          data-workspace-mapkit-host
        />
        <PlaceholderPinMap {...props} />
      </div>
    );
  }

  return (
    <div className={cn("relative h-full w-full", props.className)}>
      <div ref={hostRef} className="h-full w-full" data-workspace-mapkit-live />
    </div>
  );
}

export function WorkspaceMapView(props: WorkspaceMapViewProps) {
  if (isAppleMapKitWorkspaceEnabled()) {
    return <AppleMapKitWorkspaceMap {...props} />;
  }
  if (isMapLibreWorkspaceEnabled()) {
    return <MapLibreWorkspaceMap {...props} />;
  }
  return (
    <div className={cn("h-full w-full", props.className)}>
      <PlaceholderPinMap {...props} />
    </div>
  );
}
