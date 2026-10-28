"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { buildIcs, googleCalendarUrl } from "@/lib/calendar";
import { DURATIONS, buildPath, meetingSentence, meetingTitle, type MeetingLink } from "@/lib/link";
import {
  clockValue,
  dateValue,
  dayRelation,
  dayShift,
  formatClock,
  formatDayKey,
  formatDistance,
  formatInstant,
  formatLongDate,
  formatOffset,
  formatRange,
  formatShortDate,
  nextQuarterHour,
  parseInstant,
  resolveWallTime,
  shiftWall,
  shiftWallDays,
  snapWall,
  wallClock,
  type WallParts,
} from "@/lib/time";
import { zonePlace } from "@/lib/zones";
import { CityField } from "@/components/city-field";
import { DateField } from "@/components/date-field";
import { TimeField } from "@/components/time-field";

type MeetingState = {
  instant: Date | null;
  duration: number;
  title: string;
  zones: string[];
  from: string | null;
};

function clientQuarter(): number {
  return nextQuarterHour(new Date()).getTime();
}

function useTimeZone(): string | null {
  return useSyncExternalStore(
    () => () => {},
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    () => null,
  );
}

let cachedNow = 0;

function useNow(): number {
  return useSyncExternalStore(
    (onStoreChange) => {
      const id = window.setInterval(() => {
        cachedNow = Date.now();
        onStoreChange();
      }, 30_000);
      return () => window.clearInterval(id);
    },
    () => {
      if (!cachedNow) cachedNow = Date.now();
      return cachedNow;
    },
    () => 0,
  );
}

function useOrigin(): string {
  return useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );
}

export function Meeting({ initial }: { initial: MeetingLink }) {
  const router = useRouter();
  const timeZone = useTimeZone();
  const origin = useOrigin();
  const nowMs = useNow();
  const lengthId = useId();
  const linkRef = useRef<HTMLParagraphElement>(null);
  const createdHere = useRef(initial.instant === null && initial.from === null);
  const [copied, setCopied] = useState<{ kind: "link" | "time"; path: string } | null>(null);
  const [gapNote, setGapNote] = useState<string | null>(null);
  const [state, setState] = useState<MeetingState>(() => ({
    instant: initial.instant ? parseInstant(initial.instant) : null,
    duration: initial.duration,
    title: initial.title,
    zones: initial.zones,
    from: initial.from,
  }));

  const quarter = useSyncExternalStore(() => () => {}, clientQuarter, () => 0);
  const instant = state.instant ?? (quarter ? new Date(quarter) : null);
  const { duration, title, zones, from } = state;
  const activeMs = instant?.getTime() ?? null;

  useEffect(() => {
    if (!createdHere.current || !timeZone) return;
    setState((current) => (current.from ? current : { ...current, from: timeZone }));
  }, [timeZone]);

  useEffect(() => {
    if (!activeMs || !timeZone) return;
    const current = new Date(activeMs);
    const path = buildPath({ instant: current, duration, title, zones, from });
    const here = new URL(window.location.href);
    const next = new URL(path, window.location.origin);
    const keys = new Set([...here.searchParams.keys(), ...next.searchParams.keys()]);
    const sameParams = [...keys].every((key) => here.searchParams.get(key) === next.searchParams.get(key));
    const label = `${meetingTitle(current, duration, title, timeZone)} · Hourlink`;
    const applyTitle = () => {
      if (document.title !== label) document.title = label;
    };
    applyTitle();
    const observer = new MutationObserver(applyTitle);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    if (here.pathname === next.pathname && sameParams) return () => observer?.disconnect();
    if (here.pathname === next.pathname) {
      window.history.replaceState(null, "", path);
      return () => observer?.disconnect();
    }
    router.replace(path, { scroll: false });
    return () => observer?.disconnect();
  }, [activeMs, duration, title, zones, from, timeZone, router]);

  function selectLink() {
    const node = linkRef.current;
    if (!node) return;
    node.focus();
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(node);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function commit(patch: Partial<MeetingState>, note: string | null = null) {
    setGapNote(note);
    setState((current) => {
      const nextInstant = patch.instant ?? current.instant ?? instant;
      if (!nextInstant) return current;
      return {
        instant: nextInstant,
        duration: patch.duration ?? current.duration,
        title: patch.title ?? current.title,
        zones: patch.zones ?? current.zones,
        from: patch.from === undefined ? current.from : patch.from,
      };
    });
  }

  function applyWall(want: WallParts) {
    if (!timeZone) return;
    const snapped = snapWall(want);
    const resolved = resolveWallTime(snapped, timeZone);
    if (resolved.status === "gap") {
      const city = zonePlace(timeZone).city;
      const landed = formatClock(resolved.utc, timeZone);
      commit(
        { instant: resolved.utc },
        `${clockValue(snapped)} does not exist in ${city} that day. Moved to ${landed}.`,
      );
      return;
    }
    commit({ instant: resolved.status === "overlap" ? resolved.earlier : resolved.utc });
  }

  if (!instant || !timeZone) {
    return (
      <main className="pt-14 pb-20" aria-hidden>
        <h1 className="invisible text-[clamp(2.15rem,8.5vw,4.5rem)] leading-none">00:00–00:00</h1>
        <p className="invisible mt-4 text-lg">Wednesday 00 October 0000</p>
        <p className="invisible mt-1">City · UTC+0</p>
      </main>
    );
  }

  const parts = wallClock(instant, timeZone);
  const range = formatRange(instant, duration, timeZone);
  const utc = formatRange(instant, duration, "UTC");
  const place = zonePlace(timeZone);
  const offset = formatOffset(instant, timeZone);
  const longDate = formatLongDate(instant, timeZone);
  const path = buildPath({ instant, duration, title, zones, from });
  const href = origin ? `${origin}${path}` : path;
  const sentence = meetingSentence({ instant, duration, title, timeZone, from });
  const linkCopied = copied?.kind === "link" && copied.path === path;
  const timeCopied = copied?.kind === "time" && copied.path === path;
  const at: Date = instant;
  const viewerDay = formatDayKey(at, timeZone);
  const utcRelation = dayRelation(dayShift(viewerDay, formatDayKey(at, "UTC")));

  function whenIn(zone: string): string {
    const relation = dayRelation(dayShift(viewerDay, formatDayKey(at, zone)));
    const date = formatShortDate(at, zone);
    const off = formatOffset(at, zone);
    return relation ? `${date} · ${relation} · ${off}` : `${date} · ${off}`;
  }

  const showFrom = Boolean(from && from !== timeZone);
  const cityRows = [
    ...(showFrom && from ? [{ zone: from, removable: false }] : []),
    ...zones.filter((zone) => zone !== from).map((zone) => ({ zone, removable: true })),
  ];
  const distance = nowMs ? formatDistance(at, new Date(nowMs), timeZone) : null;
  const overlap = resolveWallTime(parts, timeZone);
  const repeated = overlap.status === "overlap" ? overlap : null;
  const spoken = `${title.trim() ? `${title.trim()}, ` : ""}${range.text}${range.nextDay ? ", next day" : ""}${range.clockChange ? ", clocks change" : ""}, ${longDate}, ${place.city}`;

  return (
    <main className="pt-14 pb-20">
      {title.trim() ? <p className="mb-3 text-base">{title.trim()}</p> : null}
      <h1
        aria-label={spoken}
        className="text-[clamp(2.15rem,8.5vw,4.5rem)] leading-none tracking-[-0.03em] tabular-nums"
      >
        {range.text}
        {range.nextDay ? <span className="ml-3 align-top text-[0.4em] text-faint">+1</span> : null}
        {range.clockChange ? (
          <span className="ml-3 align-top text-[0.35em] text-faint">clocks change</span>
        ) : null}
      </h1>
      <p className="mt-4 text-lg">{longDate}</p>
      {distance ? <p className="mt-1 text-sm text-faint">{distance}</p> : null}
      <p className="mt-1 text-faint">{place.city === "UTC" ? "UTC" : `${place.city} · ${offset}`}</p>
      {timeZone !== "UTC" ? (
        <p className="mt-6 font-mono text-sm text-faint">
          {utc.text} UTC{utcRelation ? ` · ${utcRelation}` : ""}
          {utc.nextDay ? " +1" : ""}
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-1">
        <button
          type="button"
          onClick={async () => {
            const url = `${window.location.origin}${path}`;
            try {
              await navigator.clipboard.writeText(url);
              setCopied({ kind: "link", path });
            } catch {
              selectLink();
            }
          }}
          className="min-h-11 bg-ink px-4 text-sm text-paper transition-transform duration-100 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]"
        >
          {linkCopied ? "Copied" : "Copy link"}
        </button>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(sentence);
              setCopied({ kind: "time", path });
            } catch {
              selectLink();
            }
          }}
          className="min-h-11 text-sm text-faint transition-transform duration-100 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-ink active:scale-[0.97]"
        >
          {timeCopied ? "Copied" : "Copy time"}
        </button>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        <DateField
          value={dateValue(parts)}
          onCommit={(year, month, day) => applyWall({ ...parts, year, month, day })}
          onStep={(days) => applyWall(shiftWallDays(parts, days))}
        />
        <TimeField
          value={clockValue(parts)}
          onCommit={(hour, minute) => applyWall({ ...parts, hour, minute })}
          onStep={(minutes) => applyWall(shiftWall(parts, minutes))}
        />
        <div className="sm:col-span-2">
          <span id={lengthId} className="text-xs text-faint">
            Length
          </span>
          <div role="radiogroup" aria-labelledby={lengthId} className="mt-2 flex flex-wrap gap-2">
            {DURATIONS.map((minutes) => (
              <label
                key={minutes}
                className={`cursor-pointer border px-3 py-2 text-sm transition-transform duration-100 ease-[cubic-bezier(0.23,1,0.32,1)] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 active:scale-[0.97] ${
                  duration === minutes ? "border-ink bg-ink text-paper" : "border-rule text-faint"
                }`}
              >
                <input
                  type="radio"
                  name={lengthId}
                  value={minutes}
                  checked={duration === minutes}
                  onChange={() => commit({ duration: minutes })}
                  className="sr-only"
                />
                {minutes} min
              </label>
            ))}
          </div>
        </div>
      </div>

      {repeated ? (
        <div role="group" aria-label="This hour happens twice" className="mt-4">
          <p className="text-xs text-faint">This hour happens twice</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={instant.getTime() === repeated.earlier.getTime()}
              onClick={() => commit({ instant: repeated.earlier })}
              className="min-h-11 border border-rule px-3 text-sm transition-transform duration-100 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper"
            >
              Earlier · {formatOffset(repeated.earlier, timeZone)}
            </button>
            <button
              type="button"
              aria-pressed={instant.getTime() === repeated.later.getTime()}
              onClick={() => commit({ instant: repeated.later })}
              className="min-h-11 border border-rule px-3 text-sm transition-transform duration-100 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper"
            >
              Later · {formatOffset(repeated.later, timeZone)}
            </button>
          </div>
        </div>
      ) : null}
      {gapNote ? (
        <p role="status" className="mt-4 text-sm">
          {gapNote}
        </p>
      ) : null}

      <section className="mt-12">
        <h2 className="text-xs text-faint">Cities</h2>
        {cityRows.length > 0 ? (
          <ul className="mt-2">
            {cityRows.map(({ zone, removable }) => {
              const city = zonePlace(zone);
              const row = formatRange(instant, duration, zone);
              return (
                <li key={zone} className="flex items-start justify-between gap-4 border-b border-rule py-3">
                  <div className="min-w-0">
                    <p className="truncate">{city.city}</p>
                    <p className="mt-1 tabular-nums">
                      {row.text}
                      {row.nextDay ? " +1" : ""}
                    </p>
                    <p className="mt-1 text-sm text-faint">{whenIn(zone)}</p>
                  </div>
                  {removable ? (
                    <button
                      type="button"
                      onClick={() => commit({ zones: zones.filter((item) => item !== zone) })}
                      aria-label={`Remove ${city.city}`}
                      className="min-h-11 shrink-0 text-sm text-faint transition-transform duration-100 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-ink active:scale-[0.97]"
                    >
                      Remove
                    </button>
                  ) : (
                    <span className="min-h-11 text-sm text-faint">From</span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}
        <div className={cityRows.length > 0 ? "mt-4" : "mt-3"}>
          <CityField
            zones={[...new Set([...(from ? [from] : []), ...cityRows.map((row) => row.zone)])]}
            onAdd={(zone) => {
              if (zone === from || zones.includes(zone) || zones.length >= 8) return;
              commit({ zones: [...zones, zone] });
            }}
          />
        </div>
      </section>

      <label className="mt-12 block">
        <span className="text-xs text-faint">Name</span>
        <input
          value={title}
          maxLength={80}
          placeholder="Optional"
          onChange={(event) => commit({ title: event.target.value.replace(/[\r\n]+/g, " ").slice(0, 80) })}
          className="mt-1 w-full border-0 border-b border-rule bg-transparent px-0 py-2 text-base placeholder:text-faint"
        />
      </label>

      <label className="mt-8 block">
        <span className="text-xs text-faint">Link</span>
        <p
          ref={linkRef}
          tabIndex={0}
          onFocus={selectLink}
          className="mt-1 border-b border-rule py-2 font-mono text-sm break-words outline-none"
        >
          {href.split(/(?<=[?&])/).map((part, index, parts) => (
            <span key={`${index}-${part}`}>
              {part}
              {index < parts.length - 1 ? <wbr /> : null}
            </span>
          ))}
        </p>
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1">
        <a
          href={googleCalendarUrl({ instant, duration, title })}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center text-sm text-faint hover:text-ink"
        >
          Google Calendar
        </a>
        <button
          type="button"
          onClick={() => {
            const url = `${window.location.origin}${path}`;
            const file = new File([buildIcs({ instant, duration, title, url })], "hourlink.ics", {
              type: "text/calendar",
            });
            const objectUrl = URL.createObjectURL(file);
            const anchor = document.createElement("a");
            anchor.href = objectUrl;
            anchor.download = `hourlink-${formatInstant(instant)}.ics`;
            anchor.click();
            URL.revokeObjectURL(objectUrl);
          }}
          className="min-h-11 text-sm text-faint transition-transform duration-100 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-ink active:scale-[0.97]"
        >
          Download .ics
        </button>
      </div>

      <p className="mt-14 text-sm text-faint">No account. The link is the time.</p>
    </main>
  );
}
