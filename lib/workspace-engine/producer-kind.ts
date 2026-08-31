/**
 * Rimvio ecosystem producer kinds — four artifact families.
 * Distinct from ContributorRole (economic) in reality-data-network.
 */

export const RIMVIO_PRODUCER_KINDS = [
  "capability",
  "data",
  "ontology",
  "view",
] as const;

export type RimvioProducerKind = (typeof RIMVIO_PRODUCER_KINDS)[number];

export type RimvioProducerKindSpec = {
  readonly kind: RimvioProducerKind;
  readonly titleKo: string;
  readonly questionKo: string;
  readonly hubPane?: string;
  readonly standardId?: string;
};

export const RIMVIO_PRODUCER_KIND_SPECS: Readonly<
  Record<RimvioProducerKind, RimvioProducerKindSpec>
> = {
  capability: {
    kind: "capability",
    titleKo: "Capability Producer",
    questionKo: "무엇을 할 수 있는가?",
    hubPane: "capabilities",
    standardId: "producer_guide",
  },
  data: {
    kind: "data",
    titleKo: "Data Producer",
    questionKo: "무슨 정보를 제공하는가?",
    hubPane: "data",
    standardId: "producer_guide",
  },
  ontology: {
    kind: "ontology",
    titleKo: "Ontology Producer",
    questionKo: "세상을 어떻게 구조화하는가?",
    hubPane: "standards",
    standardId: "ontology_producer_guide",
  },
  view: {
    kind: "view",
    titleKo: "Workspace / View Producer",
    questionKo: "그 정보를 어떻게 보여주고 조작하는가?",
    hubPane: "standards",
    standardId: "view_producer_guide",
  },
};

export function producerKindLabelKo(kind: RimvioProducerKind): string {
  return RIMVIO_PRODUCER_KIND_SPECS[kind].titleKo;
}
