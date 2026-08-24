"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Loader2, X } from "lucide-react";
import { useCopy } from "@/hooks/use-copy";
import { useAuth } from "@/hooks/use-auth";
import type { PcAgentDevice, PcAgentTask } from "@/lib/pc-local-agent";
import { subscribePcAgentTasksRealtime } from "@/lib/pc-local-agent/client-realtime";
import { readExecutionPhase } from "@/lib/pc-local-agent/execution-phase";
import { runPcRemoteCommand } from "@/lib/pc-local-agent/run-remote-command";
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
    return subscribePcAgentTasksRealtime(user.id, () => {
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
    });
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

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[60] flex flex-col bg-[#171717] text-white"
          data-pc-remote-chat
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <header className="flex items-center justify-between px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div className="min-w-0">
              <p className="text-[15px] font-medium tracking-tight">{pc.remoteTitle}</p>
              <p className="mt-0.5 text-[12px] text-white/45">
                {device ? (
                  <>
                    <span className="mr-1 inline-block size-1.5 rounded-full bg-emerald-400" />
                    {device.name || pc.pcFallback} · {pc.online}
                  </>
                ) : (
                  pc.notConnected
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex size-9 items-center justify-center rounded-full text-white/55 hover:bg-white/8 hover:text-white"
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
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <p className="text-[18px] font-medium tracking-tight">{pc.remoteTitle}</p>
                <p className="mt-2 max-w-[16rem] text-[14px] leading-relaxed text-white/45">
                  {pc.remoteEmpty}
                </p>
              </div>
            ) : (
              <div className="mx-auto flex w-full max-w-lg flex-col gap-5 py-4">
                {turns.map((turn) =>
                  turn.role === "user" ? (
                    <div key={turn.id} className="flex justify-end">
                      <p className="max-w-[85%] rounded-[1.25rem] bg-[#303030] px-4 py-2.5 text-[15px] leading-relaxed">
                        {turn.text}
                      </p>
                    </div>
                  ) : (
                    <div key={turn.id} className="max-w-[92%] space-y-3">
                      <p className="text-[15px] leading-relaxed text-white/88">{turn.text}</p>
                      {turn.screenshotJpeg ? (
                        <img
                          src={`data:image/jpeg;base64,${turn.screenshotJpeg}`}
                          alt=""
                          className="max-h-48 rounded-2xl object-cover shadow-sm"
                        />
                      ) : null}
                      {turn.installQuery ? (
                        <PcProgramInstallList query={turn.installQuery} />
                      ) : null}
                    </div>
                  ),
                )}
                {busy ? (
                  <p className="text-[13px] text-white/40">{pc.remoteRunning}</p>
                ) : null}
              </div>
            )}
          </div>

          <form
            onSubmit={(event) => void submit(event)}
            className="mx-auto w-full max-w-lg px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1"
          >
            <div className="flex items-end gap-2 rounded-[1.75rem] bg-[#2f2f2f] px-3 py-2 shadow-sm">
              <input
                ref={inputRef}
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder={pc.remotePlaceholder}
                className="min-h-[44px] min-w-0 flex-1 bg-transparent px-2 text-[16px] text-white outline-none placeholder:text-white/35"
                data-pc-remote-input
              />
              <button
                type="submit"
                disabled={busy || !text.trim()}
                className={cn(
                  "mb-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full transition-colors",
                  text.trim() && !busy
                    ? "bg-white text-black"
                    : "bg-white/12 text-white/30",
                )}
                aria-label={copy.globe.ingestSendAria}
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ArrowUp className="size-[18px]" strokeWidth={2.5} />
                )}
              </button>
            </div>
          </form>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
