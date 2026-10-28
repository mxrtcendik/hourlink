import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Link is not a time",
};

export default function NotFound() {
  return (
    <main className="pt-14 pb-20">
      <h1 className="text-2xl tracking-tight">That link is not a time.</h1>
      <p className="mt-3 max-w-sm text-faint">Hourlink links look like /2026-10-29T1100Z.</p>
      <Link href="/" className="mt-8 inline-flex min-h-11 items-center text-sm">
        Start from now
      </Link>
    </main>
  );
}
