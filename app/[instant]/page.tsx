import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Meeting } from "@/components/meeting";
import { cardPath, firstParam, meetingTitle, readMeetingQuery } from "@/lib/link";
import { formatInstant, parseInstant } from "@/lib/time";

type InstantPageProps = {
  params: Promise<{ instant: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

async function read(props: InstantPageProps) {
  const { instant } = await props.params;
  const search = await props.searchParams;
  return readMeetingQuery({
    instant,
    m: firstParam(search.m),
    title: firstParam(search.title),
    z: firstParam(search.z),
    from: firstParam(search.from),
  });
}

export async function generateMetadata(props: InstantPageProps): Promise<Metadata> {
  const link = await read(props);
  const instant = link?.instant ? parseInstant(link.instant) : null;
  if (!link || !instant) return { title: "Link is not a time" };

  const image = cardPath({ instant: formatInstant(instant), duration: link.duration, title: link.title });
  return {
    title: meetingTitle(instant, link.duration, link.title, "UTC"),
    description: `${link.duration} minutes. Opens in your timezone.`,
    openGraph: { images: [image] },
    twitter: { card: "summary_large_image", images: [image] },
  };
}

export default async function Page(props: InstantPageProps) {
  const link = await read(props);
  if (!link?.instant) notFound();
  return <Meeting initial={link} />;
}
