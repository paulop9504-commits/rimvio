/**
 * Domain Ontology Schema — producer registration SSOT.
 * Ontology is meaning structure, not UI.
 */

export type OntologyObjectField = {
  readonly name: string;
  readonly type: string;
  readonly required: boolean;
  readonly descriptionKo?: string;
};

export type OntologyObjectType = {
  readonly typeId: string;
  readonly titleKo: string;
  readonly fields: readonly OntologyObjectField[];
};

export type OntologyRelationKind =
  | "LOCATED_IN"
  | "LISTED_BY"
  | "HAS_IMAGE"
  | "HAS_PRICE"
  | "NEAR"
  | "HAS_ROOM"
  | "PART_OF"
  | "BOOKED_BY"
  | string;

export type OntologyRelationDef = {
  readonly kind: OntologyRelationKind;
  readonly fromType: string;
  readonly toType: string;
  readonly descriptionKo: string;
};

export type DomainOntologySchema = {
  readonly schemaId: string;
  readonly domain: string;
  readonly version: string;
  readonly titleKo: string;
  readonly descriptionKo: string;
  readonly objectTypes: readonly OntologyObjectType[];
  readonly relations: readonly OntologyRelationDef[];
  readonly verificationStatus: "UNVERIFIED" | "TESTED" | "VERIFIED" | "TRUSTED";
  readonly producerId?: string;
  readonly createdAtIso?: string;
};

export type OntologySchemaValidationResult = {
  readonly valid: boolean;
  readonly errorsKo: readonly string[];
  readonly warningsKo: readonly string[];
};

export function validateDomainOntologySchema(
  schema: DomainOntologySchema,
): OntologySchemaValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const typeIds = new Set(schema.objectTypes.map((t) => t.typeId));

  if (schema.objectTypes.length === 0) {
    errors.push("objectTypes가 비어 있습니다.");
  }

  const seenTypes = new Set<string>();
  for (const obj of schema.objectTypes) {
    if (seenTypes.has(obj.typeId)) {
      errors.push(`중복 object type: ${obj.typeId}`);
    }
    seenTypes.add(obj.typeId);
  }

  for (const rel of schema.relations) {
    if (!typeIds.has(rel.fromType)) {
      errors.push(`Relation ${rel.kind}: fromType ${rel.fromType} 미등록`);
    }
    if (!typeIds.has(rel.toType)) {
      errors.push(`Relation ${rel.kind}: toType ${rel.toType} 미등록`);
    }
  }

  if (schema.relations.length === 0) {
    warnings.push("relations 없음 — Agent composition 제한");
  }

  return {
    valid: errors.length === 0,
    errorsKo: errors,
    warningsKo: warnings,
  };
}

/** Check semantic overlap with existing schema (future registry). */
export function detectOntologyTypeOverlap(
  incoming: DomainOntologySchema,
  existing: readonly DomainOntologySchema[],
): readonly string[] {
  const warnings: string[] = [];
  for (const other of existing) {
    if (other.schemaId === incoming.schemaId) continue;
    for (const t of incoming.objectTypes) {
      if (other.objectTypes.some((o) => o.typeId === t.typeId && other.domain !== incoming.domain)) {
        warnings.push(
          `타입 ${t.typeId} — ${other.domain} ontology와 충돌 가능`,
        );
      }
    }
  }
  return warnings;
}
