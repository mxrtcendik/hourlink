import { ImageResponse } from "next/og";
import { OgCard } from "@/components/og-card";
import { cleanTitle, parseDuration } from "@/lib/link";
import { formatLongDate, formatRange, parseInstant } from "@/lib/time";

export async function GET(request: Request, context: { params: Promise<{ instant: string }> }) {
  const { instant: raw } = await context.params;
  const instant = parseInstant(decodeURIComponent(raw));
  const url = new URL(request.url);
  const duration = parseDuration(url.searchParams.get("m") ?? undefined);
  const title = cleanTitle(url.searchParams.get("title") ?? "").trim();

  if (!instant) {
    return new ImageResponse(<OgCard eyebrow="HOURLINK" title="Not a time" detail="The link needs a UTC instant" />, {
      width: 1200,
      height: 630,
    });
  }

  const range = formatRange(instant, duration, "UTC");
  return new ImageResponse(
    (
      <OgCard
        eyebrow="HOURLINK"
        title={title || `${range.text} UTC`}
        detail={title ? `${formatLongDate(instant, "UTC")} · ${range.text} UTC` : formatLongDate(instant, "UTC")}
      />
    ),
    { width: 1200, height: 630 },
  );
}
