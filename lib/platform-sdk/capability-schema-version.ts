/**
 * Hub Capability schema versioning + Agent compatibility (ADR-054 § stability).
 */

export const RIMVIO_AGENT_SCHEMA_RUNTIME = "1.0" as const;

export type ParsedSchemaRef = {
  readonly family: string;
  readonly version: number;
  readonly raw: string;
};

export type SchemaPublishValidation = {
  readonly ok: boolean;
  readonly errorKo?: string;
  readonly requiresMajorBump?: boolean;
};

/** Parse `domain.action.vN` schema refs from manifest declarations. */
export function parseSchemaRef(schema: string): ParsedSchemaRef | null {
  const trimmed = schema.trim();
  const match = /^(.+)\.v(\d+)$/.exec(trimmed);
  if (!match?.[1] || !match[2]) return null;
  const version = Number.parseInt(match[2], 10);
  if (!Number.isFinite(version) || version < 1) return null;
  return { family: match[1], version, raw: trimmed };
}

/** Agent runtime 1.x accepts v1 capability schemas; v2+ needs runtime bump. */
export function isAgentCompatibleWithSchema(schema: string): boolean {
  const parsed = parseSchemaRef(schema);
  if (!parsed) return false;
  const runtimeMajor = Number.parseInt(RIMVIO_AGENT_SCHEMA_RUNTIME.split(".")[0] ?? "1", 10);
  return parsed.version <= runtimeMajor;
}

export function validateSchemaPublishTransition(
  existing: { readonly inputSchema: string; readonly outputSchema: string } | null,
  incoming: { readonly inputSchema: string; readonly outputSchema: string },
): SchemaPublishValidation {
  if (!parseSchemaRef(incoming.inputSchema) || !parseSchemaRef(incoming.outputSchema)) {
    return { ok: false, errorKo: "스키마는 domain.action.vN 형식이어야 합니다" };
  }

  if (!existing) return { ok: true };

  const oldIn = parseSchemaRef(existing.inputSchema);
  const newIn = parseSchemaRef(incoming.inputSchema);
  const oldOut = parseSchemaRef(existing.outputSchema);
  const newOut = parseSchemaRef(incoming.outputSchema);

  if (oldIn && newIn && oldIn.family === newIn.family) {
    if (newIn.version < oldIn.version) {
      return { ok: false, errorKo: "스키마 버전은 하향할 수 없습니다" };
    }
    if (oldIn.raw !== newIn.raw && newIn.version <= oldIn.version) {
      return {
        ok: false,
        errorKo: "입력 스키마 변경은 Major 버전(vN) 증가가 필요합니다",
        requiresMajorBump: true,
      };
    }
  }

  if (oldOut && newOut && oldOut.family === newOut.family) {
    if (newOut.version < oldOut.version) {
      return { ok: false, errorKo: "스키마 버전은 하향할 수 없습니다" };
    }
    if (oldOut.raw !== newOut.raw && newOut.version <= oldOut.version) {
      return {
        ok: false,
        errorKo: "출력 스키마 변경은 Major 버전(vN) 증가가 필요합니다",
        requiresMajorBump: true,
      };
    }
  }

  return { ok: true };
}

export function schemaVersionFields(inputSchema: string, outputSchema: string): {
  readonly inputSchemaVersion: number;
  readonly outputSchemaVersion: number;
  readonly schemaFamily: string;
} {
  const input = parseSchemaRef(inputSchema);
  const output = parseSchemaRef(outputSchema);
  return {
    inputSchemaVersion: input?.version ?? 0,
    outputSchemaVersion: output?.version ?? 0,
    schemaFamily: input?.family ?? inputSchema.split(".")[0] ?? "unknown",
  };
}
