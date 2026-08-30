/**
 * In-memory ontology schema registry (MVP).
 * Production: Supabase + human review gate.
 */

import type { DomainOntologySchema } from "@/lib/workspace-engine/ontology/domain-ontology-schema";
import { SEED_ONTOLOGY_SCHEMAS } from "@/lib/workspace-engine/ontology/seed-schemas";

const schemas = new Map<string, DomainOntologySchema>(
  SEED_ONTOLOGY_SCHEMAS.map((s) => [s.schemaId, s]),
);

export function registerDomainOntologySchema(schema: DomainOntologySchema): void {
  schemas.set(schema.schemaId, schema);
}

export function getDomainOntologySchema(schemaId: string): DomainOntologySchema | null {
  return schemas.get(schemaId) ?? null;
}

export function listDomainOntologySchemas(): readonly DomainOntologySchema[] {
  return [...schemas.values()];
}

export function listOntologiesByDomain(domain: string): readonly DomainOntologySchema[] {
  return listDomainOntologySchemas().filter((s) => s.domain === domain);
}

export function resetOntologyRegistryForTests(): void {
  schemas.clear();
  for (const s of SEED_ONTOLOGY_SCHEMAS) {
    schemas.set(s.schemaId, s);
  }
}
