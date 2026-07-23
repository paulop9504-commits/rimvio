/**
 * Client circuit — after auth failure, skip remote globe polls briefly
 * so 401 storms cannot pin the main thread / WebGL.
 */

let openUntilMs = 0;

const DEFAULT_COOLDOWN_MS = 120_000;

export function noteClientAuthFailure(cooldownMs = DEFAULT_COOLDOWN_MS): void {
  openUntilMs = Math.max(openUntilMs, Date.now() + Math.max(5_000, cooldownMs));
}

export function isClientAuthCircuitOpen(now = Date.now()): boolean {
  return now < openUntilMs;
}

export function clearClientAuthCircuit(): void {
  openUntilMs = 0;
}

export function resetClientAuthCircuitForTests(): void {
  openUntilMs = 0;
}
