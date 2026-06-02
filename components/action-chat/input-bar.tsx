"use client";

import {
  Camera,
  FileUp,
  ImageIcon,
  Link2,
  Loader2,
  Mic,
  Plus,
  SendHorizontal,
  X,
} from "lucide-react";
import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useChatAmbientFocusOptional } from "@/components/action-chat/chat-ambient-focus";
import {
  glangoComposerFieldClass,
  glangoIconBtnClass,
  glangoMenuGridClass,
  glangoMenuTileBtnClass,
  glangoNavBarClass,
} from "@/lib/brand/glango-neon-theme";
import type { ChatAxis } from "@/lib/action-chat/chat-three-axis";
import type { ComposerAttachment } from "@/lib/action-chat/composer-attachments";
import { cn } from "@/lib/utils";

type ComposerPayload = {
  text: string;
  attachments?: ComposerAttachment[];
  chatAxis?: ChatAxis;
};

type ActionChatInputBarProps = {
  placeholder?: string;
  disabled?: boolean;
  sending?: boolean;
  onOpenCapture?: () => void;
  onOpenGallery?: () => void;
  onOpenLinkPaste?: () => void;
  onQuickCapture?: (file: File) => void;
  onSendMessage?: (text: string) => void;
  onSendComposer?: (payload: ComposerPayload) => void;
  className?: string;
};

export function ActionChatInputBar({
  placeholder = "오늘 무엇을 도와드릴까요? (맛집 찾기, 영수증 정리 등)",
  disabled = false,
  sending = false,
  onOpenCapture,
  onOpenGallery,
  onOpenLinkPaste,
  onQuickCapture,
  onSendMessage,
  onSendComposer,
  className,
}: ActionChatInputBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [text, setText] = useState("");
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const ambient = useChatAmbientFocusOptional();

  const syncComposerDraft = (value: string) => {
    ambient?.setComposerDraft(value.trim().length > 0);
  };

  const handleFile = (file: File | null | undefined) => {
    if (!file || !onQuickCapture) {
      return;
    }
    onQuickCapture(file);
    setMenuOpen(false);
  };

  const dispatchSend = (value: string) => {
    if (onSendComposer) {
      onSendComposer({ text: value });
      return;
    }
    onSendMessage?.(value);
  };

  const submit = () => {
    const value = text.trim();
    if (!value || disabled || sending) {
      return;
    }
    dispatchSend(value);
    setText("");
    syncComposerDraft("");
    inputRef.current?.focus();
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

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        glangoNavBarClass,
        "glango-composer-bar px-4 pb-1 pt-2",
        className,
      )}
    >
      {menuOpen ? (
        <div className={glangoMenuGridClass}>
          <button
            type="button"
            onClick={() => {
              cameraRef.current?.click();
              onOpenCapture?.();
            }}
            className={glangoMenuTileBtnClass("cyan")}
          >
            <Camera className="size-5 text-glango-neon-cyan" />
            사진 촬영
          </button>
          <button
            type="button"
            onClick={() => {
              galleryRef.current?.click();
              onOpenGallery?.();
            }}
            className={glangoMenuTileBtnClass("purple")}
          >
            <ImageIcon className="size-5 text-glango-neon-purple" />
            앨범 선택
          </button>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onOpenLinkPaste?.();
            }}
            className={glangoMenuTileBtnClass("magenta")}
          >
            <Link2 className="size-5 text-glango-neon-magenta" />
            링크 붙여넣기
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className={glangoMenuTileBtnClass("green")}
          >
            <FileUp className="size-5 text-glango-neon-green" />
            파일 첨부
          </button>
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <button
          type="button"
          aria-label={menuOpen ? "메뉴 닫기" : "입력 메뉴"}
          onClick={() => setMenuOpen((open) => !open)}
          className={glangoIconBtnClass(menuOpen ? "secondary" : "primary")}
        >
          {menuOpen ? <X className="size-5" /> : <Plus className="size-5" />}
        </button>

        <div
          className={cn(
            glangoComposerFieldClass,
            ambient?.composerLive && "glango-composer-field--live",
          )}
        >
          <textarea
            ref={inputRef}
            value={text}
            rows={1}
            disabled={disabled || sending}
            onChange={(event) => {
              const next = event.target.value;
              setText(next);
              syncComposerDraft(next);
            }}
            onFocus={() => ambient?.setComposerFocused(true)}
            onBlur={() => ambient?.setComposerFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="max-h-24 min-h-[1.25rem] w-full resize-none bg-transparent text-[15px] leading-snug text-white placeholder:text-white/75 focus:outline-none"
          />
        </div>

        {text.trim() ? (
          <button
            type="submit"
            disabled={disabled || sending}
            aria-label="보내기"
            className={glangoIconBtnClass("primary")}
          >
            {sending ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <SendHorizontal className="size-5" />
            )}
          </button>
        ) : (
          <button
            type="button"
            aria-label="음성 입력"
            className={glangoIconBtnClass("ghost")}
          >
            <Mic className="size-5" />
          </button>
        )}
      </div>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          handleFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          handleFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </form>
  );
}
