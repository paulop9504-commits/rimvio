"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ACTION_SHELL } from "@/lib/ui/action-chat-theme";

type ChatBubbleProps = {
  children: ReactNode;
  className?: string;
};

export function UserChatBubble({ children, className }: ChatBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: ACTION_SHELL.enterDuration, ease: ACTION_SHELL.enterEase }}
      className={cn("flex justify-end", className)}
    >
      <div className="chat-bubble chat-bubble--user">{children}</div>
    </motion.div>
  );
}

export function AiChatBubble({ children, className }: ChatBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: ACTION_SHELL.enterDuration, ease: ACTION_SHELL.enterEase }}
      className={cn("flex justify-start", className)}
    >
      <div className="chat-bubble chat-bubble--ai">{children}</div>
    </motion.div>
  );
}

export function ContainerEnter({ children, className }: ChatBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: ACTION_SHELL.enterDuration, ease: ACTION_SHELL.enterEase }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
