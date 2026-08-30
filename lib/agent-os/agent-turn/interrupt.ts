/**
 * Mid-turn pause / inject — user can stop or add requirements without restarting.
 */

const pause = new Set<string>();
const injections = new Map<string, string[]>();

export function requestAgentTurnPause(sessionId: string): void {
  pause.add(sessionId);
}

export function clearAgentTurnPause(sessionId: string): void {
  pause.delete(sessionId);
}

export function consumeAgentTurnPause(sessionId: string): boolean {
  if (!pause.has(sessionId)) return false;
  pause.delete(sessionId);
  return true;
}

export function injectAgentTurnRequirement(sessionId: string, requirement: string): void {
  const prev = injections.get(sessionId) ?? [];
  injections.set(sessionId, [...prev, requirement.trim()]);
}

export function consumeAgentTurnInjections(sessionId: string): readonly string[] {
  const items = injections.get(sessionId) ?? [];
  injections.delete(sessionId);
  return items;
}

export function peekAgentTurnInjections(sessionId: string): readonly string[] {
  return injections.get(sessionId) ?? [];
}

export function resetAgentTurnInterruptsForTests(): void {
  pause.clear();
  injections.clear();
}

export function detectMidTurnInjection(utterance: string): {
  readonly pause: boolean;
  readonly inject: boolean;
  readonly requirement: string | null;
} {
  const text = utterance.trim();
  if (/^(잠깐|멈춰|중지|스톱|stop|pause)$/i.test(text)) {
    return { pause: true, inject: false, requirement: null };
  }
  if (/(말고|대신).+(추가|넣어|포함)/.test(text) || /도\s*추가/.test(text)) {
    return { pause: false, inject: true, requirement: text };
  }
  return { pause: false, inject: false, requirement: null };
}
