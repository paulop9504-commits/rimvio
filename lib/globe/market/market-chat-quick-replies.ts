/** Shared Karrot-style opener lines for marketplace DM. */
export function listMarketChatQuickReplies(copy: {
  quickReplyHello: string;
  quickReplyInterest: string;
  quickReplyAvailable: string;
}): string[] {
  return [copy.quickReplyHello, copy.quickReplyInterest, copy.quickReplyAvailable];
}
