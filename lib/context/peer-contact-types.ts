/** Unlimited 1:1 friend contacts (separate from AI pin slots). */

export type PeerContact = {
  peerThreadId: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
};

export type PeerContactBook = {
  contacts: PeerContact[];
};
