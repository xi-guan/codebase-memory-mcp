import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "cbm-theme";

function readStored(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function current(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/* One source of truth for every consumer: the top bar owns the switch but the
 * GL renderer also has to repaint, and separate useState copies would drift. */
const listeners = new Set<(theme: Theme) => void>();

function apply(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  for (const listener of listeners) listener(theme);
}

/* the pre-paint script in index.html sets the initial class; this owns the rest */
export function useTheme(): [Theme, (next: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(current);

  useEffect(() => {
    listeners.add(setTheme);
    setTheme(current());
    return () => {
      listeners.delete(setTheme);
    };
  }, []);

  const choose = useCallback((next: Theme) => {
    apply(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private mode — the choice still holds for this session */
    }
  }, []);

  /* follow the OS only until the user picks a theme explicitly */
  useEffect(() => {
    if (readStored()) return;
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => {
      apply(event.matches ? "dark" : "light");
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [theme]);

  return [theme, choose];
}
