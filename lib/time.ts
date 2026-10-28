export type WallParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

export type WallResolution =
  | { status: "ok"; utc: Date }
  | { status: "gap"; utc: Date }
  | { status: "overlap"; earlier: Date; later: Date };

const INSTANT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2})(\d{2})Z$/;

export function parseInstant(value: string): Date | null {
  const match = INSTANT.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);

  if (year < 2000 || year > 2099) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (hour > 23 || minute > 59) return null;

  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute
  ) {
    return null;
  }

  return date;
}

export function formatInstant(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}${minute}Z`;
}

export function nextQuarterHour(from: Date): Date {
  const step = 15 * 60 * 1000;
  return new Date(Math.ceil(from.getTime() / step) * step);
}

export function snapWall(parts: WallParts): WallParts {
  const total = parts.hour * 60 + parts.minute;
  const snapped = Math.round(total / 15) * 15;
  const dayMinutes = 24 * 60;
  const extraDays = Math.floor(snapped / dayMinutes);
  const minutes = snapped % dayMinutes;

  if (extraDays === 0) {
    return { ...parts, hour: Math.floor(minutes / 60), minute: minutes % 60 };
  }

  const rolled = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + extraDays));
  return {
    year: rolled.getUTCFullYear(),
    month: rolled.getUTCMonth() + 1,
    day: rolled.getUTCDate(),
    hour: Math.floor(minutes / 60),
    minute: minutes % 60,
  };
}

function readParts(
  date: Date,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
): Record<string, string> {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hourCycle: "h23",
    ...options,
  });
  const parts: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") parts[part.type] = part.value;
  }
  if (parts.hour === "24") parts.hour = "00";
  return parts;
}

export function wallClock(date: Date, timeZone: string): WallParts {
  const parts = readParts(date, timeZone, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

function sameWall(date: Date, want: WallParts, timeZone: string): boolean {
  const got = wallClock(date, timeZone);
  return (
    got.year === want.year &&
    got.month === want.month &&
    got.day === want.day &&
    got.hour === want.hour &&
    got.minute === want.minute
  );
}

function offsetMinutes(date: Date, timeZone: string): number {
  const parts = readParts(date, timeZone, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return Math.round((asUtc - date.getTime()) / 60_000);
}

function matchingInstants(want: WallParts, timeZone: string): Date[] {
  const desired = Date.UTC(want.year, want.month - 1, want.day, want.hour, want.minute);
  let utcMs = desired;
  for (let pass = 0; pass < 2; pass += 1) {
    utcMs = desired - offsetMinutes(new Date(utcMs), timeZone) * 60_000;
  }

  const matches: Date[] = [];
  for (let step = -48; step <= 48; step += 1) {
    const candidate = new Date(utcMs + step * 15 * 60_000);
    if (sameWall(candidate, want, timeZone)) matches.push(candidate);
  }

  return [...new Map(matches.map((date) => [date.getTime(), date])).values()].sort(
    (a, b) => a.getTime() - b.getTime(),
  );
}

export function shiftWallDays(parts: WallParts, days: number): WallParts {
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days, parts.hour, parts.minute));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

export function shiftWall(parts: WallParts, minutes: number): WallParts {
  const shifted = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute + minutes),
  );
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

export function resolveWallTime(want: WallParts, timeZone: string): WallResolution {
  const matches = matchingInstants(want, timeZone);
  if (matches.length === 1) return { status: "ok", utc: matches[0] };
  if (matches.length > 1) {
    return { status: "overlap", earlier: matches[0], later: matches[matches.length - 1] };
  }

  for (let minutes = 15; minutes <= 180; minutes += 15) {
    const next = matchingInstants(shiftWall(want, minutes), timeZone);
    if (next.length >= 1) return { status: "gap", utc: next[0] };
  }

  return { status: "gap", utc: new Date(Date.UTC(want.year, want.month - 1, want.day, want.hour, want.minute)) };
}

export function formatClock(date: Date, timeZone: string): string {
  const parts = readParts(date, timeZone, { hour: "2-digit", minute: "2-digit" });
  return `${parts.hour}:${parts.minute}`;
}

export function formatDayKey(date: Date, timeZone: string): string {
  const parts = wallClock(date, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function formatRange(
  start: Date,
  minutes: number,
  timeZone: string,
): { text: string; nextDay: boolean; clockChange: boolean } {
  const end = new Date(start.getTime() + minutes * 60_000);
  const startParts = wallClock(start, timeZone);
  const endParts = wallClock(end, timeZone);
  const nextDay = formatDayKey(start, timeZone) !== formatDayKey(end, timeZone);
  const startMinutes = startParts.hour * 60 + startParts.minute;
  const endMinutes = endParts.hour * 60 + endParts.minute;
  return {
    text: `${formatClock(start, timeZone)}–${formatClock(end, timeZone)}`,
    nextDay,
    clockChange: !nextDay && endMinutes < startMinutes,
  };
}

export function dayShift(fromKey: string, toKey: string): number {
  const from = Date.parse(`${fromKey}T00:00:00Z`);
  const to = Date.parse(`${toKey}T00:00:00Z`);
  return Math.round((to - from) / 86_400_000);
}

export function dayRelation(shift: number): string | null {
  if (shift === 0) return null;
  if (shift === 1) return "the day after";
  if (shift === -1) return "the day before";
  if (shift > 1) return `${shift} days after`;
  return `${Math.abs(shift)} days before`;
}

export function parseDateInput(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 2000 || year > 2099 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return { year, month, day };
}

export function formatDistance(instant: Date, now: Date, timeZone: string): string | null {
  const day = dayShift(formatDayKey(now, timeZone), formatDayKey(instant, timeZone));
  if (day === 1) return "tomorrow";
  if (day === -1) return "yesterday";
  if (day !== 0) {
    const weekday = readParts(instant, timeZone, { weekday: "long" }).weekday ?? "";
    if (day > 1 && day < 7) return weekday;
    if (day >= 7 && day < 14) return `next ${weekday}`;
    if (day < -1 && day > -7) return `last ${weekday}`;
    return null;
  }

  const minutes = Math.round((instant.getTime() - now.getTime()) / 60_000);
  if (Math.abs(minutes) < 1) return "now";
  if (minutes > 0 && minutes < 60) return minutes === 1 ? "in 1 minute" : `in ${minutes} minutes`;
  if (minutes < 0 && minutes > -60) {
    const ago = -minutes;
    return ago === 1 ? "1 minute ago" : `${ago} minutes ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours > 0 && hours < 24) return hours === 1 ? "in 1 hour" : `in ${hours} hours`;
  if (hours < 0 && hours > -24) {
    const ago = -hours;
    return ago === 1 ? "1 hour ago" : `${ago} hours ago`;
  }
  return null;
}

export function parseClockInput(value: string): { hour: number; minute: number } | null {
  const trimmed = value.trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed) ?? /^(\d{2})(\d{2})$/.exec(trimmed);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

export function formatSpokenDate(date: Date, timeZone: string): string {
  const parts = readParts(date, timeZone, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return `${parts.weekday} ${parts.day} ${parts.month}`;
}

export function formatLongDate(date: Date, timeZone: string): string {
  const parts = readParts(date, timeZone, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `${parts.weekday} ${parts.day} ${parts.month} ${parts.year}`;
}

export function formatShortDate(date: Date, timeZone: string): string {
  const parts = readParts(date, timeZone, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return `${parts.weekday} ${parts.day} ${parts.month}`;
}

export function formatOffset(date: Date, timeZone: string): string {
  const raw =
    readParts(date, timeZone, { hour: "2-digit", timeZoneName: "shortOffset" }).timeZoneName ??
    "UTC";
  if (raw === "GMT" || raw === "UTC") return "UTC";

  const match = raw.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);
  if (!match) return raw.replace("GMT", "UTC");

  const hours = Number(match[2]);
  const minutes = match[3];
  if (hours === 0 && (!minutes || minutes === "00")) return "UTC";
  const sign = match[1] === "-" ? "−" : "+";
  if (!minutes || minutes === "00") return `UTC${sign}${hours}`;
  return `UTC${sign}${hours}:${minutes}`;
}

export function clockValue(parts: WallParts): string {
  return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

export function dateValue(parts: WallParts): string {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}
