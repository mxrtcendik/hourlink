# Hourlink

A meeting time, as a link. There is no account and no database.

The URL is a UTC instant, for example `/2026-10-29T1100Z`. Whoever opens it sees that moment in their own timezone. The name, length, and cities are query parameters on the same link.

Daylight-saving gaps and repeated hours are handled in `lib/time.ts`.

```bash
npm run dev
npm run build
```

`npm run build` is `next build`.

Production is [hourlink.cendik.dev](https://hourlink.cendik.dev). `NEXT_PUBLIC_SITE_URL` is set in `.env.production` so share cards use that origin. `npm run build` stays `next build`. Cloudflare builds with `npx opennextjs-cloudflare build` and deploys with `npx wrangler deploy`, or `npm run deploy` does both.
