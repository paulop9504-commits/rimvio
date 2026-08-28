"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  AGENT_HOME_TOKENS,
  type AgentHomeThemeId,
  type AgentHomeTokens,
} from "@/lib/agent/agent-home-tokens";
import { useAgentHomeTheme } from "@/hooks/use-agent-home-theme";

type AgentHomeThemeContextValue = {
  theme: AgentHomeThemeId;
  tokens: AgentHomeTokens;
  setTheme: (theme: AgentHomeThemeId) => void;
  toggleTheme: () => void;
};

const AgentHomeThemeContext = createContext<AgentHomeThemeContextValue | null>(
  null,
);

export function AgentHomeThemeProvider({ children }: { children: ReactNode }) {
  const { theme, setTheme, toggleTheme } = useAgentHomeTheme();
  const tokens = AGENT_HOME_TOKENS[theme];

  return (
    <AgentHomeThemeContext.Provider
      value={{ theme, tokens, setTheme, toggleTheme }}
    >
      {children}
    </AgentHomeThemeContext.Provider>
  );
}

export function useAgentHomeThemeContext(): AgentHomeThemeContextValue {
  const ctx = useContext(AgentHomeThemeContext);
  if (!ctx) {
    throw new Error("useAgentHomeThemeContext requires AgentHomeThemeProvider");
  }
  return ctx;
}
