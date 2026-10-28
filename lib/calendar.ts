function stamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export function googleCalendarUrl(input: {
  instant: Date;
  duration: number;
  title: string;
}): string {
  const end = new Date(input.instant.getTime() + input.duration * 60_000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title.trim() || "Meeting",
    dates: `${stamp(input.instant)}/${stamp(end)}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildIcs(input: {
  instant: Date;
  duration: number;
  title: string;
  url: string;
}): string {
  const end = new Date(input.instant.getTime() + input.duration * 60_000);
  const summary = input.title.trim() || "Meeting";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Hourlink//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${stamp(input.instant)}-${input.duration}@hourlink`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(input.instant)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escapeText(summary)}`,
    `URL:${input.url}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ];
  return lines.join("\r\n");
}
