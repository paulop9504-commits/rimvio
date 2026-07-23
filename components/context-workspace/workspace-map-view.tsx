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
import { applyTossWorkspaceMapCanvas } from "@/lib/context-workspace/map/apply-toss-workspace-map-canvas";
import { buildTossWorkspaceMarkerEl } from "@/lib/context-workspace/map/build-toss-workspace-marker-el";
import { TOSS_WORKSPACE_MAP_CANVAS } from "@/lib/context-workspace/map/toss-workspace-map-canvas-theme";
import { GLOBE_VECTOR_MAP_STYLE_URL } from "@/lib/globe/globe-vector-map-view";
import { GLOBE_TOSS_THEME } from "@/lib/globe/globe-toss-theme";
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
      <div
        className="flex h-full items-center justify-center text-[12px]"
        style={{
          background: TOSS_WORKSPACE_MAP_CANVAS.background,
          color: GLOBE_TOSS_THEME.inkMuted,
        }}
      >
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
        "relative h-full w-full overflow-hidden",
        onBackgroundActivate && "cursor-pointer text-left",
      )}
      style={{ background: TOSS_WORKSPACE_MAP_CANVAS.background }}
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
            className="absolute z-10 flex -translate-x-1/2 -translate-y-full flex-col items-center gap-1"
            style={{ left: `${x}%`, top: `${y}%` }}
            onClick={(event) => {
              event.stopPropagation();
              onSelectPin?.(node.id);
            }}
            aria-label={node.title}
          >
            <span
              className={cn(
                "inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[11px] font-bold shadow-[0_2px_8px_rgba(25,31,40,0.12)]",
                active ? "text-white" : "bg-white",
              )}
              style={{
                background: active ? GLOBE_TOSS_THEME.blue : "#fff",
                color: active ? "#fff" : GLOBE_TOSS_THEME.ink,
              }}
            >
              {compact
                ? node.amountLabel?.trim() || `★${formatRating(node.rating)}`
                : active
                  ? node.title.trim().slice(0, 10)
                  : index + 1}
            </span>
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
        applyTossWorkspaceMapCanvas(map);
        syncGlobeVectorMapSize(map, containerRef.current!);
        if (bounds) {
          map.fitBounds(
            [
              [bounds.minLng, bounds.minLat],
              [bounds.maxLng, bounds.maxLat],
            ],
            { padding: compact ? 36 : 72, maxZoom: compact ? 14 : 15.5, duration: 0 },
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
        const selected = pin.id === selectedId || Boolean(pin.selected);
        const el = buildTossWorkspaceMarkerEl({
          pin,
          index,
          selected,
          compact,
          onSelect: (id) => onSelectRef.current?.(id),
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
            padding: compact ? 36 : 72,
            maxZoom: compact ? 14.2 : 15.8,
            duration: 420,
          },
        );
      }
    })();
  }, [ready, pins, selectedId, compact]);

  return (
    <div
      className={cn("relative h-full w-full overflow-hidden", className)}
      style={{ background: TOSS_WORKSPACE_MAP_CANVAS.background }}
      data-workspace-maplibre
      data-workspace-map-style="toss"
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
        color:
          pin.id === props.selectedId
            ? GLOBE_TOSS_THEME.blue
            : GLOBE_TOSS_THEME.ink,
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
