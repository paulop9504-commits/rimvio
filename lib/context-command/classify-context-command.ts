/**
 * Classify Command Bar utterances — migrate / clone / save (ADR-028).
 */

import { extractTravelDestination } from "@/lib/experience-run/extract-travel-destination";
import type {
  ClassifiedContextCommand,
  ContextCommandKind,
} from "@/lib/context-command/types";

const SAVE =
  /(?:이\s*)?(?:상태\s*)?저장(?:해|해\s*줘|해줘|해\s*주세요|할게요)?|스냅샷\s*저장|자동\s*저장/iu;

const CLONE =
  /(?:에도|에도\s*)(?:만들|열어|복제|복사)|복제(?:해|해\s*줘)?|클론|같은\s*(?:맥락|작업장|조건).*(?:만들|열어|복사)/iu;

const MIGRATE =
  /(?:이\s*)?(?:맥락|작업장|컨텍스트|Context)?\s*.*(?:로|으로)\s*(?:옮겨|이동)|(?:로|으로)\s*(?:옮겨|이동)(?:줘|요|주세요|해)?|(?:옮겨|이동)(?:줘|요|주세요)/iu;

function extractCommandDestination(text: string): string | null {
  const known = extractTravelDestination(text);
  if (known) {
    return known;
  }
  const toPlace = text.match(
    /([가-힣A-Za-z][가-힣A-Za-z\s'.-]{1,40}?)(?:로|으로)\s*(?:옮겨|이동|옮겨줘|이동해|옮겨\s*주세요)/u,
  );
  if (toPlace?.[1] && !/(?:이|그|저|여기|거기|맥락|작업장)/u.test(toPlace[1])) {
    return toPlace[1].trim();
  }
  const also = text.match(
    /([가-힣A-Za-z][가-힣A-Za-z\s'.-]{1,40}?)(?:에도|에)\s*(?:만들|열어|복제|복사)/u,
  );
  if (also?.[1] && !/(?:이|그|저|여기|맥락|작업장)/u.test(also[1])) {
    return also[1].trim();
  }
  return null;
}

export function classifyContextCommand(
  utterance: string,
): ClassifiedContextCommand | null {
  const raw = utterance.trim();
  if (!raw) {
    return null;
  }

  let kind: ContextCommandKind | null = null;
  if (SAVE.test(raw) && !/(?:찾아|검색|예약\s*준비)/iu.test(raw)) {
    kind = "save_snapshot";
  } else if (CLONE.test(raw)) {
    kind = "clone_context";
  } else if (MIGRATE.test(raw) && !/(?:메모|공유|폴더|맥락으로\s*옮겨)/iu.test(raw)) {
    kind = "migrate_anchor";
  }

  if (!kind) {
    return null;
  }

  const destinationLabelKo =
    kind === "save_snapshot" ? null : extractCommandDestination(raw);

  if (
    (kind === "migrate_anchor" || kind === "clone_context") &&
    !destinationLabelKo
  ) {
    return null;
  }

  return {
    kind,
    destinationLabelKo,
    rawUtterance: raw,
  };
}
