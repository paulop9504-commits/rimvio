"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type GlobeComposeChatThreadProps = {
  userText: string;
  assistantText: string;
  className?: string;
  children?: ReactNode;
};

/** Globe composer — user turn + assistant reply + optional inline cards. */
export function GlobeComposeChatThread({
  userText,
  assistantText,
  className,
  children,
}: GlobeComposeChatThreadProps) {
  return (
    <div
      className={cn("flex flex-col gap-2", className)}
      data-globe-compose-chat-thread
    >
      <div className="flex justify-end">
        <p className="max-w-[88%] whitespace-pre-wrap rounded-[1rem] rounded-br-md bg-white/14 px-3 py-2 text-[13px] leading-relaxed text-white ring-1 ring-white/12">
          {userText}
        </p>
      </div>
      <div className="flex flex-col items-start gap-2">
        <p className="max-w-[92%] whitespace-pre-wrap rounded-[1rem] rounded-bl-md bg-[#121316]/92 px-3 py-2.5 text-[13px] leading-relaxed text-white/92 ring-1 ring-white/14 backdrop-blur-xl">
          {assistantText}
        </p>
        {children ? (
          <div className="w-full max-w-[96%]" data-globe-compose-chat-inline>
            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
}
