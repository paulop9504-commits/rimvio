/**
 * Small-talk variable extraction (Stage 1 of the context-aware engine).
 *
 * A raw one-liner ("ㅎㅇ") carries almost no signal. To reply like a friend who
 * knows you, we first parse the input + ambient state into 5 variable groups:
 *
 *   Time      — part of day, weekday, season (아침/월요일/여름 …)
 *   Status    — where the user is looking, weather (region; weather is a slot)
 *   History   — last topic + recent search + how many turns we've shared
 *   Tone      — length, emoji, register (반말/존댓말) — mirror the user
 *   Persona   — intimacy level, grows with conversation count
 *
 * These feed both the deterministic composer and the LLM prompt injector.
 */

export type SmallTalkPartOfDay =
  | "dawn"
  | "morning"
  | "afternoon"
  | "evening"
  | "night"
  | "late_night";

export type SmallTalkSeason = "spring" | "summer" | "autumn" | "winter";
export type SmallTalkToneShape = "terse" | "casual" | "verbose";
export type SmallTalkRegister = "banmal" | "jondaetmal";
export type SmallTalkIntimacy = 0 | 1 | 2 | 3;

export type SmallTalkTurn = { readonly role: "user" | "assistant"; readonly text: string };

export type SmallTalkContext = {
  readonly time: {
    readonly hour: number;
    readonly partOfDay: SmallTalkPartOfDay;
    readonly dayKo: string;
    readonly isWeekend: boolean;
    readonly isMonday: boolean;
    readonly isFriday: boolean;
    readonly season: SmallTalkSeason;
  };
  readonly status: {
    readonly regionKo: string | null;
    readonly weatherKo: string | null;
  };
  readonly history: {
    readonly lastUserTopicKo: string | null;
    readonly recentSearchKo: string | null;
    readonly turnCount: number;
  };
  readonly tone: {
    readonly length: number;
    readonly hasEmoji: boolean;
    readonly shape: SmallTalkToneShape;
    readonly register: SmallTalkRegister;
  };
  readonly persona: {
    readonly intimacy: SmallTalkIntimacy;
    readonly intimacyKo: string;
  };
  /** A rotation seed so deterministic replies vary across turns (not random). */
  readonly variantSeed: number;
};

const DAY_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u2764\uFE0F]/u;
const JONDAET_RE = /(요|시죠|세요|십니|습니|까요|나요|은데요|네요|어요|아요)/u;
const BANMAL_RE = /(냐\??$|니\??$|자$|해$|했어|왔어|봤어|같아|더라|는데$|거든|잖아|ㅋ|ㅎ|음$|임$)/u;

function readPartOfDay(hour: number): SmallTalkPartOfDay {
  if (hour >= 23 || hour < 5) return "late_night";
  if (hour < 7) return "dawn";
  if (hour < 11) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}

function readSeason(month0: number): SmallTalkSeason {
  const month = month0 + 1;
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

function readRegister(text: string): SmallTalkRegister {
  if (JONDAET_RE.test(text)) return "jondaetmal";
  if (BANMAL_RE.test(text)) return "banmal";
  return "jondaetmal";
}

function readToneShape(length: number): SmallTalkToneShape {
  if (length <= 4) return "terse";
  if (length >= 22) return "verbose";
  return "casual";
}

function readIntimacy(turnCount: number): SmallTalkIntimacy {
  if (turnCount >= 12) return 3;
  if (turnCount >= 5) return 2;
  if (turnCount >= 1) return 1;
  return 0;
}

const INTIMACY_KO: Record<SmallTalkIntimacy, string> = {
  0: "처음",
  1: "초면",
  2: "익숙함",
  3: "친함",
};

function pickLastUserTopic(history: readonly SmallTalkTurn[]): string | null {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const turn = history[i];
    if (turn.role === "user") {
      const t = turn.text.trim();
      if (t.length >= 2 && t.length <= 40) {
        return t;
      }
    }
  }
  return null;
}

export function extractSmallTalkContext(input: {
  text: string;
  region?: string | null;
  weatherKo?: string | null;
  history?: readonly SmallTalkTurn[];
  recentSearchKo?: string | null;
  now?: Date;
}): SmallTalkContext {
  const text = input.text.trim();
  const now = input.now ?? new Date();
  const hour = now.getHours();
  const day = now.getDay();
  const history = input.history ?? [];
  const turnCount = history.length;
  const intimacy = readIntimacy(turnCount);
  const length = text.length;

  const region = input.region?.trim() || null;

  return {
    time: {
      hour,
      partOfDay: readPartOfDay(hour),
      dayKo: DAY_KO[day],
      isWeekend: day === 0 || day === 6,
      isMonday: day === 1,
      isFriday: day === 5,
      season: readSeason(now.getMonth()),
    },
    status: {
      regionKo: region,
      weatherKo: input.weatherKo?.trim() || null,
    },
    history: {
      lastUserTopicKo: pickLastUserTopic(history),
      recentSearchKo: input.recentSearchKo?.trim() || null,
      turnCount,
    },
    tone: {
      length,
      hasEmoji: EMOJI_RE.test(text),
      shape: readToneShape(length),
      register: readRegister(text),
    },
    persona: {
      intimacy,
      intimacyKo: INTIMACY_KO[intimacy],
    },
    // Seed rotates with turn count + hour so consecutive small talks differ.
    variantSeed: turnCount * 3 + hour,
  };
}
