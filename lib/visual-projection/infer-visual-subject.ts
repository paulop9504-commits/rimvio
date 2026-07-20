import type { VisualSubjectKind } from "@/lib/visual-projection/types";

const SUBJECT_PATTERNS: readonly {
  subject: VisualSubjectKind;
  re: RegExp;
}[] = [
  { subject: "food", re: /food|dish|ramen|meal|menu|cuisine|noodle|sushi|plate|dining|맛|라멘|음식|요리/iu },
  { subject: "room", re: /room|guestroom|bedroom|suite|객실|룸|bed(?!rock)/iu },
  { subject: "pool", re: /pool|수영장|swim/iu },
  { subject: "lobby", re: /lobby|reception|로비/iu },
  {
    subject: "landmark_full",
    re: /castle|palace|temple|tower|skyline|panorama|aerial|성\s*|전경|야경|landmark/iu,
  },
  { subject: "entrance", re: /entrance|gate|입구|gateway|facade-entry/iu },
  { subject: "kitchen", re: /kitchen|주방|chef|open-kitchen/iu },
  { subject: "signage", re: /sign|signage|간판|storefront-sign|logo-board/iu },
  {
    subject: "building_exterior",
    re: /exterior|facade|building|외관|hotel-front|street-view/iu,
  },
  { subject: "interior", re: /interior|inside|내부|indoor/iu },
];

/** Infer visual subject from URL / caption cues (deterministic, no ML). */
export function inferVisualSubject(input: {
  url: string;
  subjectHint?: VisualSubjectKind | null;
  caption?: string | null;
}): VisualSubjectKind {
  if (input.subjectHint && input.subjectHint !== "unknown") {
    return input.subjectHint;
  }
  const hay = `${input.url} ${input.caption ?? ""}`;
  for (const row of SUBJECT_PATTERNS) {
    if (row.re.test(hay)) {
      return row.subject;
    }
  }
  return "unknown";
}
