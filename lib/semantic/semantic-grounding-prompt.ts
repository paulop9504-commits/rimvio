/** Compact knowledge block for LLM — rules only, no slot invent. */
export function buildSemanticGroundingPrompt(): string {
  return `[Rimvio Semantic Grounding]
- Triples are read-only projections; never write SSOT from inference.
- Transaction/Movement/Planning/Communication map to @ registry featureIds only.
- Travel playbook (deterministic): flight → lodging → rental_car.
- Food playbook: meal → navigate → taxi.
- Schedule playbook: schedule → reminder → calendar → todo.
- Rollup executed steps emit triggers edges to the next playbook step.
- Use semanticMainHint as the single suggested next step; rank existing candidates — do not invent featureIds.
- precedes means the subject hub step is done; object is the logical next hub.
`.trim();
}
