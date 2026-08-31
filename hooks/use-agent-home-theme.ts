"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AGENT_HOME_THEME_STORAGE_KEY,
  type AgentHomeThemeId,
} from "@/lib/agent/agent-home-tokens";

function readStoredTheme(): AgentHomeThemeId {
  if (typeof window === "undefined") {
    return "light";
  }
  try {
    const raw = localStorage.getItem(AGENT_HOME_THEME_STORAGE_KEY);
    return raw === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function useAgentHomeTheme() {
  const [theme, setThemeState] = useState<AgentHomeThemeId>("light");

  useEffect(() => {
    setThemeState(readStoredTheme());
  }, []);

  const setTheme = useCallback((next: AgentHomeThemeId) => {
    setThemeState(next);
    try {
      localStorage.setItem(AGENT_HOME_THEME_STORAGE_KEY, next);
    } catch {
      // quota
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [setTheme, theme]);

  return { theme, setTheme, toggleTheme };
}
