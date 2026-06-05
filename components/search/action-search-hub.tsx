"use client";

import { ActionChatFeed } from "@/components/action-chat-feed";

/** 검색 탭 — AI 대화·간단 액션 허브 (피드 composer 분리). */
export function ActionSearchHub() {
  return (
    <ActionChatFeed
      variant="conversation"
      scopeKind="search"
      links={[]}
      activeIndex={-1}
      onSelectIndex={() => {}}
      onOpenLinkPaste={() => {}}
      className="min-h-0 flex-1"
    />
  );
}
