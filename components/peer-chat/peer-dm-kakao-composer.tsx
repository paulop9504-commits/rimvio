"use client";

import { ArrowUp, AudioLines, Hash, Loader2, Plus, Smile } from "lucide-react";
import type { FormEvent, KeyboardEvent, RefObject } from "react";
import { toast } from "sonner";
import { copy } from "@/lib/copy/human-ko";
import { DM_KAKAO_COMPOSER } from "@/lib/peer-chat/dm-chat-density";
import { cn } from "@/lib/utils";

export type PeerDmKakaoComposerProps = {
  text: string;
  onTextChange: (value: string) => void;
  onSubmit: () => void | Promise<void>;
  onFormSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  imageInputRef: RefObject<HTMLInputElement | null>;
  onImageSelected: (file: File | null) => void;
  canSend: boolean;
  readOnly?: boolean;
  composerBusy: boolean;
  canSendImage: boolean;
  imageBusy: boolean;
  aiBusy: boolean;
  className?: string;
};

/** 1:1 DM — 카톡식 다크 pill 컴포저 (+ · 입력 · 이모지 · # · 음성 / 입력 시 전송) */
export function PeerDmKakaoComposer({
  text,
  onTextChange,
  onSubmit,
  onFormSubmit,
  onKeyDown,
  inputRef,
  imageInputRef,
  onImageSelected,
  canSend,
  readOnly = false,
  composerBusy,
  canSendImage,
  imageBusy,
  aiBusy,
  className,
}: PeerDmKakaoComposerProps) {
  const hasText = text.trim().length > 0;
  const disabled = !canSend || readOnly || composerBusy;

  const soon = () => {
    toast.message(copy.peers.dmChat.featureSoon);
  };

  return (
    <div
      className={cn(
        "shrink-0 bg-background px-2 pt-1 pb-[max(0.375rem,env(safe-area-inset-bottom))]",
        className,
      )}
      data-rimvio-dm-kakao-composer
    >
      <form onSubmit={onFormSubmit} className={DM_KAKAO_COMPOSER.bar}>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            event.target.value = "";
            onImageSelected(file);
          }}
        />
        {canSendImage && !readOnly ? (
          <button
            type="button"
            aria-label={copy.peers.dmChat.attachAria}
            disabled={composerBusy}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => imageInputRef.current?.click()}
            className={DM_KAKAO_COMPOSER.plusBtn}
          >
            {imageBusy ? (
              <Loader2 className="size-5 animate-spin" aria-hidden />
            ) : (
              <Plus className="size-6 stroke-[2]" aria-hidden />
            )}
          </button>
        ) : null}
        <textarea
          ref={inputRef}
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          enterKeyHint="send"
          autoComplete="off"
          autoCorrect="on"
          disabled={disabled}
          placeholder={
            readOnly
              ? copy.peers.dmChat.readOnlyPlaceholder
              : copy.peers.dmChat.messagePlaceholder
          }
          className={DM_KAKAO_COMPOSER.input}
        />
        {hasText ? (
          <button
            type="button"
            disabled={disabled || !hasText}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => void onSubmit()}
            className={DM_KAKAO_COMPOSER.sendBtn}
            aria-label={copy.peers.dmChat.sendAria}
          >
            {aiBusy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <ArrowUp className="size-[18px] stroke-[2.5]" aria-hidden />
            )}
          </button>
        ) : (
          <>
            <button
              type="button"
              className={DM_KAKAO_COMPOSER.iconBtn}
              aria-label={copy.peers.dmChat.emojiAria}
              disabled={readOnly}
              onMouseDown={(event) => event.preventDefault()}
              onClick={soon}
            >
              <Smile className="size-[22px] stroke-[1.75]" aria-hidden />
            </button>
            <button
              type="button"
              className={DM_KAKAO_COMPOSER.iconBtnFilled}
              aria-label={copy.peers.dmChat.hashAria}
              disabled={readOnly}
              onMouseDown={(event) => event.preventDefault()}
              onClick={soon}
            >
              <Hash className="size-[18px] stroke-[2.25]" aria-hidden />
            </button>
            <button
              type="button"
              className={DM_KAKAO_COMPOSER.iconBtnFilled}
              aria-label={copy.peers.dmChat.voiceAria}
              disabled={readOnly}
              onMouseDown={(event) => event.preventDefault()}
              onClick={soon}
            >
              <AudioLines className="size-[18px] stroke-[2.25]" aria-hidden />
            </button>
          </>
        )}
      </form>
    </div>
  );
}
