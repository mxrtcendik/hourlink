"use client";

import { useId, useState } from "react";
import { parseClockInput } from "@/lib/time";

export function TimeField({
  value,
  onCommit,
  onStep,
}: {
  value: string;
  onCommit: (hour: number, minute: number) => void;
  onStep: (minutes: number) => void;
}) {
  const hintId = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? value;

  function commitDraft(next: string) {
    const parsed = parseClockInput(next);
    setDraft(null);
    if (!parsed) return;
    onCommit(parsed.hour, parsed.minute);
  }

  return (
    <label className="block">
      <span className="text-xs text-faint">Time</span>
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
            onStep(event.key === "ArrowUp" ? 15 : -15);
          } else if (event.key === "Enter") {
            event.preventDefault();
            commitDraft(shown);
          }
        }}
        className="mt-1 w-full min-w-0 border-0 border-b border-rule bg-transparent px-0 py-2 text-base tabular-nums"
      />
      <span id={hintId} className="sr-only">
        24-hour time. Up and down move by 15 minutes.
      </span>
    </label>
  );
}
