/** Unique LiteAPI Payment SDK mount — one target per checkout session. */
export function resolveLiteApiPaymentTargetId(sessionId: string): string {
  return `liteapi-payment-target-${sessionId.trim()}`;
}

export function resolveLiteApiPaymentTargetSelector(sessionId: string): string {
  return `#${resolveLiteApiPaymentTargetId(sessionId)}`;
}
