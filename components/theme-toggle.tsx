"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

function subscribe() {
  return () => {};
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const theme = mounted ? resolvedTheme : undefined;
  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={theme ? `Switch to ${next}` : "Switch theme"}
      className="min-h-11 min-w-10 text-right text-sm text-faint transition-transform duration-100 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-ink active:scale-[0.97]"
    >
      {theme === "dark" ? "Light" : theme === "light" ? "Dark" : "\u00a0"}
    </button>
  );
}
