import {
  dayRelation,
  dayShift,
  formatDayKey,
  formatInstant,
  formatRange,
  formatShortDate,
  formatSpokenDate,
  parseInstant,
} from "./time";
import { parseZoneList, zonePlace } from "./zones";

export const DURATIONS = [15, 30, 45, 60, 90] as const;
export const DEFAULT_DURATION = 30;
export const MAX_ZONES = 8;
export const MAX_TITLE = 80;

export type MeetingLink = {
  instant: string | null;
  duration: number;
  title: string;
  zones: string[];
  from: string | null;
};

export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function cleanTitle(value: string): string {
  return value.replace(/[\r\n]+/g, " ").slice(0, MAX_TITLE);
}

export function parseDuration(value: string | undefined): number {
  const duration = Number(value);
  return DURATIONS.includes(duration as (typeof DURATIONS)[number]) ? duration : DEFAULT_DURATION;
}

export function parseZone(value: string | undefined): string | null {
  return parseZoneList(value, 1)[0] ?? null;
}

export function readMeetingQuery(input: {
  instant: string | null;
  m?: string;
  title?: string;
  z?: string;
  from?: string;
}): MeetingLink | null {
  if (input.instant !== null && !parseInstant(input.instant)) return null;
  return {
    instant: input.instant,
    duration: parseDuration(input.m),
    title: cleanTitle(input.title ?? "").trim(),
    zones: parseZoneList(input.z, MAX_ZONES),
    from: parseZone(input.from),
  };
}

export function buildPath(link: {
  instant: Date;
  duration: number;
  title: string;
  zones: string[];
  from: string | null;
}): string {
  const params = new URLSearchParams();
  if (link.duration !== DEFAULT_DURATION) params.set("m", String(link.duration));

  const title = cleanTitle(link.title).trim();
  if (title) params.set("title", title);
  if (link.from) params.set("from", link.from);
  if (link.zones.length > 0) params.set("z", link.zones.join(","));

  const query = params.toString();
  return `/${formatInstant(link.instant)}${query ? `?${query}` : ""}`;
}

export function cardPath(link: { instant: string; duration: number; title: string }): string {
  const params = new URLSearchParams();
  if (link.duration !== DEFAULT_DURATION) params.set("m", String(link.duration));
  const title = cleanTitle(link.title).trim();
  if (title) params.set("title", title);
  const query = params.toString();
  return `/card/${link.instant}${query ? `?${query}` : ""}`;
}

export function meetingSentence(input: {
  instant: Date;
  duration: number;
  title: string;
  timeZone: string;
  from: string | null;
}): string {
  const local = formatRange(input.instant, input.duration, input.timeZone);
  const utc = formatRange(input.instant, input.duration, "UTC");
  const place = input.timeZone === "UTC" ? "UTC" : zonePlace(input.timeZone).city;
  const parts = [`${formatSpokenDate(input.instant, input.timeZone)}, ${local.text} ${place}`];

  if (input.from && input.from !== input.timeZone) {
    const there = formatRange(input.instant, input.duration, input.from);
    const relation = dayRelation(
      dayShift(formatDayKey(input.instant, input.timeZone), formatDayKey(input.instant, input.from)),
    );
    const place = zonePlace(input.from).city;
    parts.push(relation ? `${there.text} ${place}, ${relation}` : `${there.text} ${place}`);
  }

  if (input.timeZone !== "UTC") parts.push(`${utc.text} UTC`);
  const body = parts.join(" · ");
  const title = input.title.trim();
  return title ? `${title} · ${body}` : body;
}

export function meetingTitle(instant: Date, duration: number, title: string, timeZone: string): string {
  const range = formatRange(instant, duration, timeZone).text;
  const when = `${formatShortDate(instant, timeZone)}, ${range}`;
  const place = timeZone === "UTC" ? "UTC" : zonePlace(timeZone).city;
  const head = title.trim() ? `${title.trim()} · ${when}` : when;
  return `${head} ${place}`;
}
