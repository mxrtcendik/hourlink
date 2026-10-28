"use client";

import { useId, useState } from "react";
import { parseDateInput } from "@/lib/time";

export function DateField({
  value,
  onCommit,
  onStep,
}: {
  value: string;
  onCommit: (year: number, month: number, day: number) => void;
  onStep: (days: number) => void;
}) {
  const hintId = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? value;

  function commitDraft(next: string) {
    const parsed = parseDateInput(next);
    setDraft(null);
    if (!parsed) return;
    onCommit(parsed.year, parsed.month, parsed.day);
  }

  return (
    <label className="block">
      <span className="text-xs text-faint">Date</span>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        aria-describedby={hintId}
        value={shown}
        onFocus={() => setDraft(value)}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => commitDraft(shown)}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            setDraft(null);
            onStep(event.key === "ArrowUp" ? 1 : -1);
          } else if (event.key === "Enter") {
            event.preventDefault();
            commitDraft(shown);
          }
        }}
        className="mt-1 w-full min-w-0 border-0 border-b border-rule bg-transparent px-0 py-2 text-base tabular-nums"
      />
      <span id={hintId} className="sr-only">
        Year, month, day. Up and down move by one day.
      </span>
    </label>
  );
}
