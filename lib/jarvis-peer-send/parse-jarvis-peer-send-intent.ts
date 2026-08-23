/**
 * NL → Jarvis peer send intent (recipient + meeting/message body).
 * Deterministic-first — no LLM required for the happy path.
 */

export type JarvisPeerSendIntent = {
  readonly recipientQuery: string;
  readonly intentText: string;
  readonly shareTrip: boolean;
  readonly rawUtterance: string;
};

const RECIPIENT_SUFFIX = /(?:한테|에게|께)$/u;

const SEND_PATTERNS: readonly RegExp[] = [
  /^(?<recipient>.+?)(?:한테|에게|께)\s+(?<intent>.+?)\s*(?:메신저|메시지|톡|dm|DM)(?:\s*(?:으로|로))?\s*(?:보내|전송|써|작성)(?:줘|주세요|해)?\s*$/iu,
  /^(?<recipient>.+?)(?:한테|에게|께)\s+(?<intent>.+?)\s*(?:라고|이라고)\s*(?:해|말)(?:줘|주세요)?\s*$/iu,
  /^(?<recipient>.+?)(?:한테|에게|께)\s+(?<intent>.+?)\s*(?:공유|전달)(?:해)?(?:줘|주세요)?\s*$/iu,
  /^(?<recipient>.+?)(?:한테|에게|께)\s+(?<intent>.+?)\s*(?:보내|전송)(?:줘|주세요|해)?\s*$/iu,
];

const SHARE_TRIP_HINT =
  /(?:일정|여행|플랜|스케줄|캘린더).*(?:공유|보내|전달)|(?:공유|보내|전달).*(?:일정|여행|플랜)/iu;

export function normalizeRecipientQuery(raw: string): string {
  return raw
    .trim()
    .replace(RECIPIENT_SUFFIX, "")
    .replace(/(이|가|은|는|을|를)$/u, "")
    .trim();
}

function cleanIntentText(raw: string): string {
  return raw
    .trim()
    .replace(/\s*(?:메신저|메시지|톡|dm|DM)(?:\s*(?:으로|로))?\s*(?:보내|전송|써|작성)(?:줘|주세요|해)?\s*$/iu, "")
    .replace(/\s*(?:라고|이라고)\s*(?:해|말)(?:줘|주세요)?\s*$/iu, "")
    .replace(/\s*(?:공유|전달)(?:해)?(?:줘|주세요)?\s*$/iu, "")
    .replace(/\s*(?:보내|전송)(?:줘|주세요|해)?\s*$/iu, "")
    .trim();
}

export function parseJarvisPeerSendIntent(
  utterance: string,
): JarvisPeerSendIntent | null {
  const raw = utterance.trim();
  if (!raw || raw.startsWith("@")) {
    return null;
  }

  for (const pattern of SEND_PATTERNS) {
    const match = raw.match(pattern);
    if (!match?.groups?.recipient || !match.groups.intent) {
      continue;
    }
    const recipientQuery = normalizeRecipientQuery(match.groups.recipient);
    const intentText = cleanIntentText(match.groups.intent);
    if (!recipientQuery || !intentText) {
      continue;
    }
    return {
      recipientQuery,
      intentText,
      shareTrip: SHARE_TRIP_HINT.test(raw),
      rawUtterance: raw,
    };
  }

  return null;
}

export function isJarvisPeerSendIntent(text: string): boolean {
  return parseJarvisPeerSendIntent(text) !== null;
}
