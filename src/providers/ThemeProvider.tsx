"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { THEME_KEY } from "@/lib/constants";

export type ThemePreference = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  /** What the user chose. */
  preference: ThemePreference;
  /** What is actually painted right now. */
  theme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Same-tab notification; the `storage` event only fires in *other* tabs. */
const THEME_EVENT = "novacrm:theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

/* --- The stored preference, treated as the external store it is ----------- */

function subscribePreference(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(THEME_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(THEME_EVENT, onChange);
  };
}

function readPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
  } catch {
    return "system";
  }
}

/* --- The OS setting ------------------------------------------------------- */

function subscribeSystem(onChange: () => void): () => void {
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function readSystemDark(): boolean {
  return window.matchMedia(DARK_QUERY).matches;
}

/**
 * The blocking script in app/layout.tsx applies the right class before first
 * paint. This provider reads the same two external sources — localStorage and
 * the OS preference — and keeps the document class in step with them.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const preference = useSyncExternalStore(
    subscribePreference,
    readPreference,
    () => "system" as const,
  );
  const systemDark = useSyncExternalStore(subscribeSystem, readSystemDark, () => false);
  const firstPass = useRef(true);

  const theme: ResolvedTheme =
    preference === "system" ? (systemDark ? "dark" : "light") : preference;

  // Writing to the DOM is exactly what an effect is for.
  useEffect(() => {
    const root = document.documentElement;

    // The hydration render resolves the two stores through `getServerSnapshot`
    // — "system" and not-dark — because the server has no access to either.
    // React corrects that in a re-render immediately afterwards, but this
    // effect fires once in between with `theme === "light"`. Writing that to
    // the DOM would strip the class the blocking script set and flash a
    // dark-mode visitor to light on every page load.
    //
    // The blocking script runs the same resolution this provider does, so on
    // the first pass the document is already right by construction: adopt it
    // rather than overwrite it, and only take control from the second pass on.
    if (firstPass.current) {
      firstPass.current = false;
      root.dataset.theme = root.classList.contains("dark") ? "dark" : "light";
      return;
    }

    const alreadyCorrect = root.classList.contains("dark") === (theme === "dark");

    // Cross-fade only on a genuine change, so the toggle animates but a route
    // change or an unrelated re-render does not.
    if (alreadyCorrect) {
      root.dataset.theme = theme;
      return;
    }

    root.classList.add("theme-transition");
    root.classList.toggle("dark", theme === "dark");
    root.dataset.theme = theme;

    const timer = window.setTimeout(() => root.classList.remove("theme-transition"), 220);
    return () => {
      window.clearTimeout(timer);
      root.classList.remove("theme-transition");
    };
  }, [theme]);

  const setPreference = useCallback((next: ThemePreference) => {
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      // Storage disabled — the choice simply will not survive a reload.
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  const toggle = useCallback(() => {
    setPreference(theme === "dark" ? "light" : "dark");
  }, [theme, setPreference]);

  const value = useMemo(
    () => ({ preference, theme, setPreference, toggle }),
    [preference, theme, setPreference, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside <ThemeProvider>");
  return context;
}
