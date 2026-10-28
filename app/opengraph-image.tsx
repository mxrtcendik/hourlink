import { ImageResponse } from "next/og";
import { OgCard } from "@/components/og-card";

export const alt = "Hourlink";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <OgCard eyebrow="HOURLINK" title="A meeting time, as a link." detail="No account" />,
    { ...size },
  );
}
