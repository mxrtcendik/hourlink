export const SUGGESTED_ZONES = [
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "America/Chicago",
  "Europe/Istanbul",
  "Europe/Berlin",
  "Europe/Paris",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "America/Sao_Paulo",
  "Africa/Lagos",
] as const;

let supportedZones: Set<string> | null = null;

export function isSupportedZone(timeZone: string): boolean {
  supportedZones ??= new Set(Intl.supportedValuesOf("timeZone"));
  return supportedZones.has(timeZone);
}

export function zonePlace(timeZone: string): { city: string; region: string } {
  const parts = timeZone.split("/");
  const city = (parts.at(-1) ?? timeZone).replaceAll("_", " ");
  const region = parts.length > 1 ? parts[0].replaceAll("_", " ") : "";
  return { city, region };
}

export function parseZoneList(value: string | undefined, limit = 8): string[] {
  if (!value) return [];

  const zones: string[] = [];
  for (const raw of value.split(",")) {
    const zone = raw.trim();
    if (!zone || zone.startsWith("Etc/") || !isSupportedZone(zone) || zones.includes(zone)) continue;
    zones.push(zone);
    if (zones.length >= limit) break;
  }
  return zones;
}

export function searchZones(query: string, exclude: readonly string[]): string[] {
  const skip = new Set(exclude);
  const supported = Intl.supportedValuesOf("timeZone").filter(
    (zone) => !zone.startsWith("Etc/") && !skip.has(zone),
  );

  const needle = query.trim().toLowerCase().replaceAll(" ", "_");
  if (!needle) {
    return SUGGESTED_ZONES.filter((zone) => supported.includes(zone)).slice(0, 8);
  }

  return supported
    .map((zone) => {
      const city = zone.split("/").at(-1)?.toLowerCase() ?? "";
      const id = zone.toLowerCase();
      let score = 3;
      if (city.startsWith(needle)) score = 0;
      else if (city.includes(needle)) score = 1;
      else if (id.includes(needle)) score = 2;
      else return null;
      return { zone, score, city };
    })
    .filter((item): item is { zone: string; score: number; city: string } => item !== null)
    .sort((a, b) => a.score - b.score || a.city.localeCompare(b.city))
    .slice(0, 8)
    .map((item) => item.zone);
}
