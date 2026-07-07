/** 관계망 UI — 프로덕션 숨김. dev에서 `NEXT_PUBLIC_RIMVIO_PALANTIR_ONTOLOGY_DEV=1` 일 때만 표시. */
export function isPalantirOntologyDevSurfaceEnabled(): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  return process.env.NEXT_PUBLIC_RIMVIO_PALANTIR_ONTOLOGY_DEV === "1";
}
