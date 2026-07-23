/**
 * Lazy Apple MapKit JS loader — no-op until credentials + enable flag.
 */

import {
  readAppleMapKitClientConfig,
} from "@/lib/context-workspace/map/apple-mapkit-config";

declare global {
  interface Window {
    mapkit?: {
      init: (options: {
        authorizationCallback: (done: (token: string) => void) => void;
      }) => void;
      Map: new (
        element: HTMLElement,
        options?: Record<string, unknown>,
      ) => {
        destroy: () => void;
        showItems: (items: unknown[]) => void;
      };
      Coordinate: new (lat: number, lng: number) => unknown;
      MarkerAnnotation: new (
        coordinate: unknown,
        options?: Record<string, unknown>,
      ) => unknown;
      CoordinateRegion: new (
        center: unknown,
        span: unknown,
      ) => unknown;
      CoordinateSpan: new (latDelta: number, lngDelta: number) => unknown;
    };
  }
}

let loadPromise: Promise<boolean> | null = null;

export async function loadAppleMapKitLibrary(): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }
  const config = readAppleMapKitClientConfig();
  if (!config.enabled) {
    return false;
  }
  if (window.mapkit) {
    return true;
  }
  if (loadPromise) {
    return loadPromise;
  }
  loadPromise = new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-rimvio-apple-mapkit="1"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(Boolean(window.mapkit)));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = config.libraryUrl;
    script.async = true;
    script.dataset.rimvioAppleMapkit = "1";
    script.crossOrigin = "anonymous";
    script.onload = () => resolve(Boolean(window.mapkit));
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
  return loadPromise;
}

/**
 * Init MapKit with JWT from Rimvio token route.
 * Returns false if token missing / library failed — caller keeps placeholder.
 */
export async function initAppleMapKitWithToken(): Promise<boolean> {
  const config = readAppleMapKitClientConfig();
  if (!config.enabled) {
    return false;
  }
  const ok = await loadAppleMapKitLibrary();
  if (!ok || !window.mapkit) {
    return false;
  }
  try {
    await new Promise<void>((resolve, reject) => {
      window.mapkit!.init({
        authorizationCallback: (done) => {
          void fetch(config.tokenUrl)
            .then((res) => res.json())
            .then((body: { token?: string; error?: string }) => {
              if (!body.token?.trim()) {
                reject(new Error(body.error || "mapkit_token_missing"));
                return;
              }
              done(body.token.trim());
              resolve();
            })
            .catch(reject);
        },
      });
    });
    return true;
  } catch {
    return false;
  }
}
