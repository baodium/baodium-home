# Baodium

Permanent homepage for [Adewale Obadimu](https://baodium.com). This is the studio index: individual products stay on their own subdomains and separate Vercel projects.

Static site. No database, no auth, no backend, and no environment variables.

Next.js (App Router) + TypeScript + Tailwind CSS v4. Motion is built with [`motion`](https://motion.dev) (load choreography, scroll-linked parallax, pointer tilt) and [`lenis`](https://lenis.darkroom.engineering) smooth scrolling on desktop pointers. Everything falls back to a static layout under `prefers-reduced-motion`.

## Run locally

```bash
npm install
npm run dev
npm run build
```

## Deploy

Import this GitHub repository in Vercel. No environment variables are required. Attach `baodium.com` as the canonical domain and redirect `www` to the apex.

`interview.baodium.com` (Interview Coach) and `upto.baodium.com` (UpTo) stay on their own projects. Do not attach those domains here.

## Hero portrait

The still is `public/images/adewale-hero-poster.jpg`. It is masked into the page with CSS gradients (`.hero-photo-mask` in `src/app/globals.css`) so the black studio background has no hard edge. The book cover is `public/projects/practical-system-design.png`.

An optional muted loop can be added at `public/media/adewale-hero.mp4`. When that file is present and motion is allowed, it plays over the still. `prefers-reduced-motion` keeps the still and does not play video.

Keep the MP4 small. Do not commit an uncompressed master. If the file later outgrows a normal static asset, Vercel Blob is an optional follow-up — the component does not need it now.

## Where things live

- `src/components/hero/` — portrait, circuit-line field, kinetic Engineer / Builder / Author type
- `src/components/Projects.tsx`, `ProjectCard.tsx` — bento of project cards (tilt, spotlight, gradient border)
- `src/components/book/` — 3D book, red glow, self-drawing p50/p99 latency chart
- `src/components/Writing.tsx` — essays list, or the "coming soon" state while `writing` is empty
- `src/components/About.tsx`, `Footer.tsx`, `Marquee.tsx`, `Navigation.tsx`

## Adding a project

Add an object to `src/data/projects.ts`.

## Adding an essay

Add an object to the `writing` array in `src/data/writing.ts` (`title`, `description`, `href`, `date`). The book is a separate object in that file.

## Before launch

Set real GitHub, LinkedIn, and email values in `src/data/site.ts`. Blank values are not shown.
