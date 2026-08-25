"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Folder, Plus, Shield, X } from "lucide-react";
import { useCopy } from "@/hooks/use-copy";
import { useAuth } from "@/hooks/use-auth";
import type { PcAgentDevice, PcAgentTask } from "@/lib/pc-local-agent";
import { subscribePcAgentTasksRealtime } from "@/lib/pc-local-agent/client-realtime";
import { readExecutionPhase } from "@/lib/pc-local-agent/execution-phase";
import { runPcRemoteCommand } from "@/lib/pc-local-agent/run-remote-command";
import { PcContinuityPreviewCard } from "@/components/pc-continuity-preview-card";
import { PcProgramInstallList } from "@/components/globe/pc-program-install-list";
import { cn } from "@/lib/utils";

type RemoteTurn = {
  id: string;
  role: "user" | "assistant";
  text: string;
  taskId?: string;
  installQuery?: string;
  screenshotJpeg?: string | null;
};

function phaseLine(
  task: PcAgentTask,
  copy: {
    remoteRunning: string;
    remoteOpened: string;
    stepReady: string;
    stepFailed: string;
    agentAwaitHuman: string;
  },
): string {
  const phase = readExecutionPhase(task);
  if (phase === "COMPLETED") {
    return copy.stepReady;
  }
  if (phase === "FAILED" || phase === "CANCELLED") {
    return copy.stepFailed;
  }
  if (phase === "WAITING_USER" || phase === "HUMAN_REQUIRED" || phase === "AUTH_REQUIRED") {
    return copy.agentAwaitHuman;
  }
  if (phase === "BROWSER_OPENED" || phase === "PAGE_READY") {
    return copy.remoteOpened;
  }
  return copy.remoteRunning;
}

export function PcRemoteChatOverlay({
  open,
  device,
  onClose,
}: {
  open: boolean;
  device: PcAgentDevice | null;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const copy = useCopy();
  const pc = copy.globe.pcContinuity;
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [turns, setTurns] = useState<RemoteTurn[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const taskIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!open) {
      return;
    }
    window.setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  const patchTaskTurn = useCallback(
    (task: PcAgentTask) => {
      setTurns((prev) =>
        prev.map((turn) => {
          if (turn.taskId !== task.id) {
            return turn;
          }
          return {
            ...turn,
            text: phaseLine(task, pc),
            screenshotJpeg: task.result?.screenshotJpeg ?? turn.screenshotJpeg,
          };
        }),
      );
    },
    [pc],
  );

  useEffect(() => {
    if (!open || !user?.id) {
      return;
    }
    const pull = () => {
      const ids = taskIdsRef.current;
      if (ids.size === 0) {
        return;
      }
      void fetch("/api/pc-agent/tasks?limit=8", { cache: "no-store" })
        .then((res) => res.json())
        .then((data: { tasks?: PcAgentTask[] }) => {
          for (const task of data.tasks ?? []) {
            if (ids.has(task.id)) {
              patchTaskTurn(task);
            }
          }
        })
        .catch(() => undefined);
    };
    const unsub = subscribePcAgentTasksRealtime(user.id, pull);
    const id = window.setInterval(pull, 1_400);
    return () => {
      unsub();
      window.clearInterval(id);
    };
  }, [open, user?.id, patchTaskTurn]);

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    const value = text.trim();
    if (!value || busy) {
      return;
    }
    setBusy(true);
    setText("");
    const userTurn: RemoteTurn = {
      id: `u-${Date.now()}`,
      role: "user",
      text: value,
    };
    setTurns((prev) => [...prev, userTurn]);
    try {
      const result = await runPcRemoteCommand(value);
      const assistant: RemoteTurn = {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: result.messageKo,
        taskId: result.kind === "preview" ? result.task.id : undefined,
        installQuery: result.kind === "arming" ? result.query : undefined,
      };
      if (assistant.taskId) {
        taskIdsRef.current.add(assistant.taskId);
      }
      setTurns((prev) => [...prev, assistant]);
    } finally {
      setBusy(false);
    }
  };

  const title = device?.name?.trim() || pc.remoteTitle;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[60] flex flex-col text-[#1c1c1e]"
          data-pc-remote-chat
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          style={{
            background:
              "radial-gradient(900px 520px at 12% 0%, rgba(186,214,255,.85), transparent 58%), radial-gradient(720px 480px at 92% 8%, rgba(232,214,255,.7), transparent 52%), linear-gradient(180deg,#e7edf4,#dfe6ee)",
          }}
        >
          <header className="flex items-center gap-2 px-3 pb-2 pt-[max(0.7rem,env(safe-area-inset-top))]">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] text-[#8e8e93]">
                Rimvio <span className="mx-1 text-[#c7c7cc]">›</span> {title}
                <span className="mx-1 text-[#c7c7cc]">·</span> 진행
              </p>
              <p className="mt-1 truncate text-[20px] font-semibold tracking-tight">{title}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-[#8e8e93] hover:bg-white/70"
              aria-label={copy.globe.containerSpaceRuntimeBack}
            >
              <X className="size-5" strokeWidth={1.75} />
            </button>
          </header>

          <div
            ref={listRef}
            className="min-h-0 flex-1 overflow-y-auto px-4 pb-3"
            data-pc-remote-thread
          >
            {turns.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-8 text-center">
                <p className="max-w-[16rem] text-[15px] leading-relaxed text-[#636366]">
                  {pc.remoteEmpty}
                </p>
              </div>
            ) : (
              <div className="mx-auto flex w-full max-w-lg flex-col gap-5 py-3">
                {turns.map((turn) =>
                  turn.role === "user" ? (
                    <div key={turn.id} className="flex justify-end">
                      <p className="max-w-[85%] rounded-[18px] bg-[#ececee] px-4 py-2.5 text-[15px] leading-relaxed tracking-tight">
                        {turn.text}
                      </p>
                    </div>
                  ) : (
                    <div key={turn.id} className="max-w-[94%] space-y-3">
                      <p className="text-[15px] leading-relaxed tracking-tight text-[#2c2c2e]">
                        {turn.text}
                      </p>
                      {turn.taskId ? (
                        <PcContinuityPreviewCard
                          taskId={turn.taskId}
                          title={turn.text}
                          deviceName={device?.name}
                        />
                      ) : null}
                      {!turn.taskId && turn.screenshotJpeg ? (
                        <img
                          src={`data:image/jpeg;base64,${turn.screenshotJpeg}`}
                          alt=""
                          className="max-h-52 w-full rounded-[16px] object-cover shadow-[0_18px_40px_rgba(16,24,40,0.12)]"
                        />
                      ) : null}
                      {turn.installQuery ? (
                        <PcProgramInstallList query={turn.installQuery} />
                      ) : null}
                    </div>
                  ),
                )}
                {busy ? (
                  <p className="text-[13px] text-[#8e8e93]">{pc.remoteRunning}</p>
                ) : null}
              </div>
            )}
          </div>

          <form
            onSubmit={(event) => void submit(event)}
            className="mx-auto w-full max-w-lg px-3 pb-[max(0.55rem,env(safe-area-inset-bottom))] pt-1"
          >
            <div className="flex items-center gap-1 rounded-[27px] border border-black/[0.04] bg-white px-2 py-1.5 shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
              <span className="flex size-9 items-center justify-center text-[#8e8e93]">
                <Plus className="size-[18px]" strokeWidth={1.8} />
              </span>
              <input
                ref={inputRef}
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder={pc.remotePlaceholder}
                className="min-h-[40px] min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#a1a1a6]"
                data-pc-remote-input
              />
              <button
                type="submit"
                disabled={busy || !text.trim()}
                className={cn(
                  "inline-flex size-9 shrink-0 items-center justify-center rounded-full transition-colors",
                  text.trim() && !busy ? "bg-[#111] text-white" : "bg-[#111]/20 text-white/70",
                )}
                aria-label={copy.globe.ingestSendAria}
              >
                <ArrowUp className="size-[16px]" strokeWidth={2.4} />
              </button>
            </div>
            <div className="mt-2 flex items-center gap-4 px-2 text-[12px] text-[#6e6e73]">
              <span className="inline-flex items-center gap-1.5">
                <Folder className="size-3.5 opacity-70" strokeWidth={1.8} />
                {device ? pc.online : pc.notConnected}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Shield className="size-3.5 text-[#34c759]" strokeWidth={1.8} />
                보호
              </span>
              <span className="ml-auto">Rimvio</span>
              <span>바로</span>
            </div>
          </form>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
