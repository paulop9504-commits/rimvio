"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { parseFriendAddQrPayload } from "@/lib/peer-chat/friend-add-qr-url";

type FriendAddQrScannerProps = {
  open: boolean;
  onClose: () => void;
  onScanned: (contact: string) => void;
  title: string;
  hint: string;
  unsupportedHint: string;
};

export function FriendAddQrScanner({
  open,
  onClose,
  onScanned,
  title,
  hint,
  unsupportedHint,
}: FriendAddQrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePayload = useCallback(
    (raw: string) => {
      if (busyRef.current) {
        return;
      }
      const contact = parseFriendAddQrPayload(raw);
      if (!contact) {
        return;
      }
      busyRef.current = true;
      onScanned(contact);
      onClose();
    },
    [onClose, onScanned],
  );

  useEffect(() => {
    if (!open) {
      busyRef.current = false;
      setError(null);
      return;
    }

    let stream: MediaStream | null = null;
    let raf = 0;
    let cancelled = false;

    const start = async () => {
      const Detector = (
        window as Window & {
          BarcodeDetector?: new (opts: { formats: string[] }) => {
            detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
          };
        }
      ).BarcodeDetector;

      if (!Detector) {
        setError(unsupportedHint);
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled || !videoRef.current) {
          return;
        }
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const detector = new Detector({ formats: ["qr_code"] });

        const tick = async () => {
          if (cancelled || !videoRef.current || videoRef.current.readyState < 2) {
            raf = window.requestAnimationFrame(() => void tick());
            return;
          }
          try {
            const codes = await detector.detect(videoRef.current);
            const raw = codes[0]?.rawValue;
            if (raw) {
              handlePayload(raw);
              return;
            }
          } catch {
            // keep scanning
          }
          raf = window.requestAnimationFrame(() => void tick());
        };
        void tick();
      } catch {
        setError(unsupportedHint);
      }
    };

    void start();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      stream?.getTracks().forEach((track) => track.stop());
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [open, handlePayload, unsupportedHint]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="닫기"
            className="fixed inset-0 z-[90] bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal
            aria-label={title}
            className="fixed inset-x-4 top-[10dvh] z-[91] mx-auto max-w-md overflow-hidden rounded-2xl bg-[#1c1c1e] shadow-2xl"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
          >
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-[15px] font-semibold text-white">{title}</p>
              <button
                type="button"
                onClick={onClose}
                className="flex size-9 items-center justify-center rounded-full text-white/80"
                aria-label="닫기"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="relative aspect-square bg-black">
              <video
                ref={videoRef}
                className="size-full object-cover"
                playsInline
                muted
              />
              <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-white/70" />
            </div>
            <p className="px-4 py-3 text-center text-[12px] text-white/60">
              {error ?? hint}
            </p>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
