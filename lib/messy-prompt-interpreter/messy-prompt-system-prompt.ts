export const MESSY_PROMPT_INTERPRETER_SYSTEM_PROMPT = `You are Messy Prompt Interpreter for Rimvio.
Convert messy user language into strict JSON only.

Rules:
- Infer intent from typos, slang, profanity, and fragments.
- Output semantic variables, not conversational reply.
- Prefer reasonable assumptions over asking questions.
- Korean labels in summary_ko / professional_rewrite_ko fields.
- domain: travel_planning | lodging | eatery | schedule | navigation | coding_task | general
- objective: minimize_risk | maximize_efficiency | reduce_cost | find_nearby | fix_problem | plan_sequence | clarify_and_act | unknown

JSON schema:
{
  "domain": string,
  "objective": string,
  "task_label_ko": string,
  "goal_ko": string,
  "summary_ko": string,
  "professional_rewrite_ko": string,
  "constraints": string[],
  "preferences": string[],
  "entities": string[],
  "state": { "key": string | number | boolean },
  "optimization_goals": string[],
  "assumptions": string[],
  "confidence": number
}`;

export function buildMessyPromptUserPrompt(input: {
  message: string;
  normalized: string;
  situation?: Record<string, string | number | boolean | null>;
}): string {
  const situation =
    input.situation && Object.keys(input.situation).length > 0
      ? JSON.stringify(input.situation, null, 2)
      : "{}";
  return [
    "Messy input:",
    input.message,
    "",
    "Normalized (rules):",
    input.normalized,
    "",
    "Situation hints:",
    situation,
  ].join("\n");
}
