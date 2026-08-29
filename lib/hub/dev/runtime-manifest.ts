/**
 * rimvio.runtime.json — Hub Runtime manifest validation (ADR-062).
 */

import { RIMVIO_CORE_RUNTIME_STANDARD } from "@/lib/hub/dev/hub-registry-stores";
import type {
  RimvioRuntimeManifest,
  RuntimeInterface,
  RuntimeSupport,
  RuntimeType,
} from "@/lib/hub/dev/runtime-registry";

const RUNTIME_TYPES: RuntimeType[] = ["pc", "browser", "industrial", "cloud", "mobile"];
const SUPPORTS: RuntimeSupport[] = ["camera", "plc", "sensor", "database", "network"];
const INTERFACES: RuntimeInterface[] = ["context", "event", "tool", "permission"];

export function buildRimvioRuntimeManifestJson(manifest: RimvioRuntimeManifest): string {
  return JSON.stringify(
    {
      $schema: "rimvio.runtime.v1",
      name: manifest.name,
      version: manifest.version,
      tier: manifest.tier,
      type: manifest.type,
      supports: manifest.supports,
      interfaces: manifest.interfaces,
      ownerCreatorId: manifest.ownerCreatorId,
      entry: manifest.entry,
      rimvioStandardVersion: manifest.rimvioStandardVersion,
      securityPolicy: "rimvio-enforced",
    },
    null,
    2,
  );
}

export function parseRimvioRuntimeManifestJson(json: string): {
  valid: boolean;
  manifest?: RimvioRuntimeManifest;
  error?: string;
} {
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const name = String(parsed.name ?? "").trim();
    const version = String(parsed.version ?? "").trim();
    const type = parsed.type as RuntimeType;
    if (!name || !version) {
      return { valid: false, error: "name and version required" };
    }
    if (!RUNTIME_TYPES.includes(type)) {
      return { valid: false, error: `invalid type: ${String(parsed.type)}` };
    }
    const supports = (parsed.supports as RuntimeSupport[]) ?? [];
    const interfaces = (parsed.interfaces as RuntimeInterface[]) ?? [];
    if (!interfaces.includes("permission") || !interfaces.includes("tool")) {
      return {
        valid: false,
        error: "tool and permission interfaces required (Rimvio Core Standard)",
      };
    }
    return {
      valid: true,
      manifest: {
        name,
        version,
        tier: (parsed.tier as RimvioRuntimeManifest["tier"]) ?? "extension",
        type,
        supports: supports.filter((s) => SUPPORTS.includes(s)),
        interfaces: interfaces.filter((i) => INTERFACES.includes(i)),
        ownerCreatorId: String(parsed.ownerCreatorId ?? "unknown"),
        entry: String(parsed.entry ?? "runtime/index.ts"),
        rimvioStandardVersion:
          String(parsed.rimvioStandardVersion ?? RIMVIO_CORE_RUNTIME_STANDARD.version),
      },
    };
  } catch {
    return { valid: false, error: "invalid JSON" };
  }
}

export const RUNTIME_PACKAGE_LAYOUT = `factory-runtime/
├── rimvio.runtime.json
├── runtime/
│   ├── index.ts
│   ├── tools/
│   └── adapters/
└── tests/` as const;
