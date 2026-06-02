/** 1:1 peer room message — local log only (cloud sync later). */

export type PeerMessageAuthor = "me" | "peer";

export type PeerMessage = {
  id: string;
  peerThreadId: string;
  author: PeerMessageAuthor;
  body: string;
  sentAt: string;
};

export type PeerMessageLog = {
  peerThreadId: string;
  messages: PeerMessage[];
  updatedAt: string;
};
