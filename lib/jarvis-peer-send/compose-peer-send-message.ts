/**
 * Intent → natural Korean DM body (Jarvis drafts on user's behalf).
 */

const MEETING_HINT =
  /(?:보자|만나|약속|미팅|뵙|만날|만나자|보자고|만나자고)/iu;

const TIME_HINT = /(\d{1,2})\s*(?:시|:|\.)?\s*(?:(\d{1,2})\s*분)?/u;

const PLACE_HINT =
  /(?:에서|역|카페|호텔|공원|센터|몰|점|동|구|시|역\s*\d+\s*번\s*출구)/u;

function casualVocative(displayName: string): string {
  const name = displayName.trim();
  if (!name) {
    return "친구";
  }
  if (name.endsWith("님")) {
    return name;
  }
  const last = name.at(-1) ?? "";
  if (/[가-힣]/u.test(last)) {
    const code = last.charCodeAt(0) - 0xac00;
    const jong = code % 28;
    if (jong === 0) {
      return `${name}야`;
    }
    return `${name}아`;
  }
  return `${name}님`;
}

function normalizeMeetingPhrase(intentText: string): string {
  let text = intentText.trim();
  text = text.replace(/\s+/g, " ");
  text = text.replace(/에서\s+에서/gu, "에서");

  if (MEETING_HINT.test(text)) {
    return text.replace(/보자고?/iu, "보자").replace(/만나자고?/iu, "만나자");
  }

  const timeMatch = text.match(TIME_HINT);
  const hasPlace = PLACE_HINT.test(text);
  if (timeMatch || hasPlace) {
    const suffix = timeMatch ? `${timeMatch[0].trim()}에 보자` : "보자";
    if (!MEETING_HINT.test(text)) {
      return `${text} ${suffix}`.replace(/\s+/g, " ").trim();
    }
  }

  return text;
}

export function composePeerSendMessage(input: {
  readonly recipientDisplayName: string;
  readonly intentText: string;
  readonly shareTripLabel?: string | null;
  readonly tripScheduleLines?: readonly string[] | null;
}): string {
  const vocative = casualVocative(input.recipientDisplayName);
  let body = normalizeMeetingPhrase(input.intentText);

  if (input.shareTripLabel?.trim()) {
    const label = input.shareTripLabel.trim();
    const schedule =
      input.tripScheduleLines?.filter((line) => line.trim()).slice(0, 5) ?? [];
    if (schedule.length > 0) {
      body = `${label} 일정 공유할게!\n📅 ${label}\n${schedule.join("\n")}\n\n${body}`;
    } else {
      body = `${label} 일정 공유할게!\n${body}`;
    }
  }

  if (body.includes(vocative) || body.includes(input.recipientDisplayName.trim())) {
    if (!body.endsWith("!") && !body.endsWith("?") && !body.endsWith(".")) {
      body = `${body}!`;
    }
    return body;
  }

  const composed = `${vocative}, ${body}`;
  if (!composed.endsWith("!") && !composed.endsWith("?") && !composed.endsWith(".")) {
    return `${composed}!`;
  }
  return composed;
}
