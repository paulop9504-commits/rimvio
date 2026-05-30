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
import { cn } from "@/lib/utils";

type ActionChatInputBarProps = {
  placeholder?: string;
  disabled?: boolean;
  sending?: boolean;
  onOpenCapture?: () => void;
  onOpenGallery?: () => void;
  onOpenLinkPaste?: () => void;
  onQuickCapture?: (file: File) => void;
  onSendMessage?: (text: string) => void;
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
  className,
}: ActionChatInputBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [text, setText] = useState("");
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleFile = (file: File | null | undefined) => {
    if (!file || !onQuickCapture) {
      return;
    }
    onQuickCapture(file);
    setMenuOpen(false);
  };

  const submit = () => {
    const value = text.trim();
    if (!value || disabled || sending) {
      return;
    }
    onSendMessage?.(value);
    setText("");
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
        "border-t border-black/[0.04] bg-white/90 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl",
        className
      )}
    >
      {menuOpen ? (
        <div className="mb-2 grid grid-cols-4 gap-2 rounded-[16px] border border-black/[0.04] bg-[#F9FAFB] p-2.5">
          <button
            type="button"
            onClick={() => {
              cameraRef.current?.click();
              onOpenCapture?.();
            }}
            className="flex flex-col items-center gap-1 rounded-xl bg-white px-2 py-2.5 text-[11px] font-medium text-[#374151]"
          >
            <Camera className="size-5 text-[#4A90E2]" />
            사진 촬영
          </button>
          <button
            type="button"
            onClick={() => {
              galleryRef.current?.click();
              onOpenGallery?.();
            }}
            className="flex flex-col items-center gap-1 rounded-xl bg-white px-2 py-2.5 text-[11px] font-medium text-[#374151]"
          >
            <ImageIcon className="size-5 text-[#4A90E2]" />
            앨범 선택
          </button>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onOpenLinkPaste?.();
            }}
            className="flex flex-col items-center gap-1 rounded-xl bg-white px-2 py-2.5 text-[11px] font-medium text-[#374151]"
          >
            <Link2 className="size-5 text-[#4A90E2]" />
            링크 붙여넣기
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="flex flex-col items-center gap-1 rounded-xl bg-white px-2 py-2.5 text-[11px] font-medium text-[#374151]"
          >
            <FileUp className="size-5 text-[#4A90E2]" />
            파일 첨부
          </button>
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <button
          type="button"
          aria-label={menuOpen ? "메뉴 닫기" : "입력 메뉴"}
          onClick={() => setMenuOpen((open) => !open)}
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full text-white transition-transform active:scale-95",
            menuOpen ? "bg-[#9CA3AF]" : "bg-[#4A90E2]"
          )}
        >
          {menuOpen ? <X className="size-5" /> : <Plus className="size-5" />}
        </button>

        <div className="flex min-h-10 flex-1 items-end rounded-[14px] border border-black/[0.06] bg-[#F3F4F6] px-3 py-2">
          <textarea
            ref={inputRef}
            value={text}
            rows={1}
            disabled={disabled || sending}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="max-h-24 min-h-[1.25rem] w-full resize-none bg-transparent text-[15px] leading-snug text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none"
          />
        </div>

        {text.trim() ? (
          <button
            type="submit"
            disabled={disabled || sending}
            aria-label="보내기"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#4A90E2] text-white shadow-[0_4px_12px_rgba(74,144,226,0.28)] disabled:opacity-60"
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
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F1F2F6] text-[#6B7280]"
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
