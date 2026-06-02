"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, Loader2, Sheet, X } from "lucide-react";
import {
  buildGoogleSheetsOpenUrl,
  resolveGoogleSheetsEmbed,
  type GoogleSheetsEmbedMode,
} from "@/lib/integrations/google-sheets-embed";
import { cn } from "@/lib/utils";

export type GoogleSheetsEmbedTarget = {
  url: string;
  title?: string;
};

type GoogleSheetsEmbedSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: GoogleSheetsEmbedTarget | null;
};

export function GoogleSheetsEmbedSheet({
  open,
  onOpenChange,
  target,
}: GoogleSheetsEmbedSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<GoogleSheetsEmbedMode>("edit");
  const [frameLoading, setFrameLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setMode("edit");
      setFrameLoading(true);
    }
  }, [open, target?.url]);

  const resolved = useMemo(() => {
    if (!target?.url) {
      return null;
    }
    return resolveGoogleSheetsEmbed(target.url, mode);
  }, [target?.url, mode]);

  if (!mounted) {
    return null;
  }

  const title = target?.title?.trim() || "Google Sheets";
  const openUrl = target?.url ? buildGoogleSheetsOpenUrl(target.url) : "";

  return createPortal(
    <AnimatePresence>
      {open && target && resolved ? (
        <>
          <motion.button
            type="button"
            aria-label="닫기"
            className="fixed inset-0 z-[90] bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-label={title}
            className="fixed inset-x-0 bottom-0 z-[91] mx-auto flex max-h-[min(92vh,900px)] w-full max-w-3xl flex-col overflow-hidden rounded-t-[24px] border border-white/10 bg-[#1F2937] shadow-[0_-12px_40px_rgba(0,0,0,0.4)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#30D158]/15 text-[#86EFAC]">
                  <Sheet className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-[#F3F4F6]">{title}</p>
                  <p className="truncate text-[11px] text-[#9CA3AF]">
                    Google Sheets · {mode === "edit" ? "편집" : "미리보기"}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <div className="mr-1 flex rounded-lg border border-white/10 p-0.5">
                  <button
                    type="button"
                    onClick={() => setMode("edit")}
                    className={cn(
                      "rounded-md px-2 py-1 text-[10px] font-semibold transition",
                      mode === "edit"
                        ? "bg-[#32D7FF]/20 text-[#7DD3FC]"
                        : "text-[#9CA3AF] hover:text-[#E5E7EB]",
                    )}
                  >
                    편집
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("preview")}
                    className={cn(
                      "rounded-md px-2 py-1 text-[10px] font-semibold transition",
                      mode === "preview"
                        ? "bg-[#32D7FF]/20 text-[#7DD3FC]"
                        : "text-[#9CA3AF] hover:text-[#E5E7EB]",
                    )}
                  >
                    보기
                  </button>
                </div>
                <a
                  href={openUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex size-8 items-center justify-center rounded-full text-[#9CA3AF] hover:bg-white/5"
                  aria-label="새 탭에서 열기"
                >
                  <ExternalLink className="size-4" />
                </a>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="flex size-8 items-center justify-center rounded-full text-[#9CA3AF] hover:bg-white/5"
                  aria-label="닫기"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <div className="relative min-h-0 flex-1 bg-[#111827]">
              {frameLoading ? (
                <div className="absolute inset-0 z-[1] flex items-center justify-center bg-[#111827]">
                  <Loader2 className="size-6 animate-spin text-glango-neon-cyan" />
                </div>
              ) : null}
              <iframe
                key={resolved.embedUrl}
                title={title}
                src={resolved.embedUrl}
                className="absolute inset-0 h-full w-full border-0 bg-white"
                allow="clipboard-read; clipboard-write"
                referrerPolicy="no-referrer-when-downgrade"
                onLoad={() => setFrameLoading(false)}
              />
            </div>

            <p className="border-t border-white/[0.06] px-4 py-2 text-[10px] leading-relaxed text-[#6B7280]">
              시트가 안 보이면 Google 로그인·공유 권한을 확인하거나 새 탭에서 열어 주세요.
            </p>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
