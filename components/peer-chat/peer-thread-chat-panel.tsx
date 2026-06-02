"use client";

import Link from "next/link";
import { SendHorizontal, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { queuePeerMentionForAiChat } from "@/lib/context/build-peer-composer-context";
import { usePeerThreadChat } from "@/hooks/use-peer-thread-chat";
import type { PeerThreadPolicyInput } from "@/lib/context/peer-thread-types";
import { cn } from "@/lib/utils";

type PeerThreadChatPanelProps = {
  displayName: string;
  policyInput: PeerThreadPolicyInput;
  aiLensEnabled: boolean;
  readOnly?: boolean;
  showAiMentionLink?: boolean;
};

export function PeerThreadChatPanel({
  displayName,
  policyInput,
  aiLensEnabled,
  readOnly = false,
  showAiMentionLink = true,
}: PeerThreadChatPanelProps) {
  const { messages, canSend, send } = usePeerThreadChat(policyInput);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const submit = () => {
    if (!text.trim() || !canSend || readOnly) {
      return;
    }
    send(text, "me");
    setText("");
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  const openAiWithMention = () => {
    queuePeerMentionForAiChat(displayName);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            {readOnly ? (
              "AI 허브 해제 후 여기로 가려해요"
            ) : showAiMentionLink ? (
              <>
                {displayName}와 나눈 말을 여기에
                <br />
                AI 실행 창에서 @{displayName} 로 이어갈 수 있어요
              </>
            ) : (
              <>
                {displayName}와 대화해요
                <br />
                AI @import는 AI 허브에 꽂인 친구만 사용할 수 있어요
              </>
            )}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {messages.map((message) => (
              <li
                key={message.id}
                className={cn(
                  "flex",
                  message.author === "me" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-snug",
                    message.author === "me"
                      ? "rounded-br-md bg-glango-neon-purple text-white"
                      : "rounded-bl-md bg-glango-surface-raised text-foreground",
                  )}
                >
                  {message.body}
                </div>
              </li>
            ))}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border bg-glango-surface/95 px-3 py-2">
        {!readOnly && showAiMentionLink ? (
          <Link
            href="/"
            onClick={openAiWithMention}
            className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-full border border-glango-neon-purple/20 bg-glango-neon-purple/10 py-2 text-[11px] font-medium text-glango-neon-purple active:scale-[0.98]"
          >
            <Sparkles className="size-3.5" aria-hidden />
            AI 실행에서 @{displayName} 맥락으로 물어보기
          </Link>
        ) : null}

        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={!canSend || readOnly}
            placeholder={
              readOnly
                ? "AI 허브 해제 후 메시지를 보낼 수 있어요"
                : canSend
                  ? "메시지 입력"
                  : "친구 목록에 추가하면 대화가 저장돼요"
            }
            className="max-h-28 min-h-[2.5rem] flex-1 resize-none rounded-2xl bg-glango-surface-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-glango-neon-cyan/30"
          />
          <button
            type="submit"
            disabled={!canSend || !text.trim()}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-glango-neon-purple text-white disabled:opacity-40"
            aria-label="보내기"
          >
            <SendHorizontal className="size-4" aria-hidden />
          </button>
        </form>
        {aiLensEnabled ? (
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            AI 렌즈 ON · 맥락·Rail 분석 대기
          </p>
        ) : null}
      </div>
    </div>
  );
}
