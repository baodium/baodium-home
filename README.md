# Baodium

Permanent homepage for [Adewale Obadimu](https://baodium.com). This is the studio index: individual products stay on their own subdomains and separate Vercel projects.

Static site. No database, no auth, no backend, and no environment variables.

## Run locally

```bash
npm install
npm run dev
npm run build
```

## Deploy

Import this GitHub repository in Vercel. No environment variables are required. Attach `baodium.com` as the canonical domain and redirect `www` to the apex.

`interview.baodium.com` (Interview Coach) stays a separate Vercel project. Do not attach that domain here.

## Hero portrait

The still is `public/images/adewale-hero-poster.jpg`. The frame crops toward the portrait with `object-position: 72% center`.

An optional muted loop can be added at `public/media/adewale-hero.mp4`. When that file is present and motion is allowed, it plays over the still. `prefers-reduced-motion` keeps the still and does not play video.

Keep the MP4 small. Do not commit an uncompressed master. If the file later outgrows a normal static asset, Vercel Blob is an optional follow-up — the component does not need it now.

## Adding a project

Add an object to `src/data/projects.ts`.

## Before launch

Replace the placeholder GitHub, LinkedIn, and email hrefs in `src/data/site.ts`. There is no book purchase URL yet.
