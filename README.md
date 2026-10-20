# The Little Engineer — Milan Singla

An interactive developer portfolio in four parts, led by an original hand-drawn
stickman. Warm paper background, black ink, one restrained electric blue.

| Part | What happens |
| --- | --- |
| **01 — The Unexpected Entrance** | The stickman draws the name and the headline, then lifts the page like a sheet of paper. |
| **02 — The Engineer's Journey** | A road draws itself down the page; the stickman walks it through five milestones to a door. |
| **03 — The Things I've Built** | Four chapters — Shipyard, Termedu, VRxED Meet, VRxNuro — each with its own drawing and a "How it's built" panel. |
| **04 — The Playground and the Final Act** | A simulated terminal, a freehand drawing pad, a debugging incident, and the contact scene where the stickman draws the button. |

## Stack

Next.js 16 (App Router, production build with `next start`), React 19,
TypeScript, GSAP (core + MorphSVGPlugin, both in the free `gsap` package), plain
CSS, and two self-hosted variable fonts (`@fontsource-variable/fraunces`,
`@fontsource-variable/inter`). No scroll library, no UI kit, no analytics, no
external requests at runtime. There are no environment variables.

## Quick start

Prerequisites: Node.js 20 or newer (developed on 22) and npm.

```bash
npm install
npm run dev          # http://localhost:3000
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build (`npx next start -p 3111` to pick a port) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run assets` | Regenerate `public/assets/stickman/*.svg` from `poses.json` |
| `npm run test:e2e` | Browser tests against a running production server (see below) |
| `npm run test:runner` | Self-test of the test runner: proves a failing or crashing suite can never report success. Needs no server or browser |

There is no linter configured.

## Sharing it through a tunnel (Cloudflare Tunnel, ngrok, …)

**Expose the production server, not `npm run dev`.**

```bash
npm run build
npx next start -p 3111          # then point the tunnel at http://localhost:3111
```

Why: `next dev` serves development-only endpoints (`/_next/hmr`, a WebSocket) and, since Next.js 16, refuses
dev resources to any host other than localhost. Opened through a tunnel the page's scripts never start, the
console fills with `WebSocket connection to '…/_next/webpack-hmr' failed`, and only the server-rendered shell
shows. The production server has none of that.

If you really need the dev server on a public name, allow that one host explicitly (never `*`). Next.js
answers 403 to dev resources from unlisted hosts. (In a sandbox reproduction listing the host alone did not
make the dev page start, so treat the dev server behind a tunnel as unreliable and prefer the production one.)

```bash
ALLOWED_DEV_ORIGINS=my-name.trycloudflare.com npm run dev
```

See `.env.example`. As a safety net, if the page's scripts have not started within 10 seconds the boot script
switches to the finished, scrollable page (`html.fallback`) instead of leaving the entrance blank.

Query flags: `?intro=full` forces the entrance animation, `?intro=skip` shows the
finished composition, `?debug` exposes the intro timeline as `window.__intro`.
Hashes `#part-02`, `#part-03`, `#part-04`, `#contact` and `#milestone-N` deep-link
past the entrance.

## Tests

The tests are browser tests written with Python Playwright, kept in `tests/e2e/`.
They drive a **running production server**. `tests/run-all.sh` exits non-zero if any suite fails, crashes,
prints a traceback, runs no checks or does not finish; it exits 2 if there is no server.

```bash
python3 -m pip install playwright
python3 -m playwright install chromium

npm run build
npx next start -p 3111          # terminal 1
npm run test:e2e                # terminal 2 (BASE_URL=... to use another address)
```

Screenshots from the runs go to `/tmp/little-engineer-e2e` (override with `E2E_OUT`).

| File | Covers |
| --- | --- |
| `part1_flows.py`, `part1_extra.py` | Part 01: entrance, skip, mouse / keyboard / touch flows, the "Who's this guy?" bubble, the hand-off to Part 02 |
| `part2.py`, `journey_scroll.py`, `journey_states.py` | Part 02: road and walker, milestone rail, door into Part 03, back to Part 01, deep links, reduced motion, no-JS |
| `part3.py` | Part 03: scroll scrubbing, links, images, details panels, keyboard, no-JS |
| `part4.py` | Part 04: terminal allow-list and hostile input, the freehand pad (strokes, colour, size, eraser, undo, clear, pointer capture, pen, touch, high-DPI), incident, contact links, final animation, no-JS, reduced motion |
| `a11y_cleanup_replay.py` | Heading structure, colour contrast, incident replay, listener cleanup (set `DEV_URL` to a `next dev` server to also compare React Strict Mode) |
| `layout_perf.py` | 1440 / 1280 / 768 / 390 / 320 px: overflow, layout shift, failed requests, console errors, tiny text and touch targets |
| `branding_seo.py` | MS monogram (overlap, home link, hover, focus, reduced motion, no-JS), favicon files, the `/cv` page (embed, phone preview, download, back link), redacted CV, metadata / canonical / JSON-LD / robots / sitemap output, remembered music "ready" state, Part 02 walker going straight down on a phone |
| `polish_sound.py` | Sound and ambient layer: muted by default and no audio context before the visitor opts in, toggles, localStorage, rate limits, quiet levels, music off by default / fades / never restored, audio blocked or missing, ambient click-through / paused with the tab / still under reduced motion, keyboard and focus, tuck-away on scroll, stickman reactions |
| `lifecycle_perf.py` | Part 03's per-frame callback sleeps when settled and far away, Part 01's figure stops when Part 02+ is open, reduced motion runs no per-frame work, and the 10-second fallback when scripts never start |

## Folder overview

```
src/app/                 layout (metadata, pre-paint boot script), global + per-part CSS
src/components/          Portfolio (Part 01 + wiring), Stickman, journey/ (Part 02-04 shells),
                         projects/ (Part 03), playground/ (Part 04)
src/lib/stickman/        poses.json (single source of truth for the character), rig.ts, mover.ts
src/lib/intro/           Part 01 timeline, interactions, paper-lift
src/lib/journey/         Part 02 data, road/walker controller, milestone illustrations
src/lib/projects/        Part 03 data (with provenance), timelines, controller
src/lib/playground/      Part 04 data, terminal logic, freehand drawing engine (pad.ts), controller
public/                  stickman pose SVGs, project screenshots (Shipyard also has a licence file)
scripts/                 generate-stickman-assets.mjs
docs/                    avatar-lab-evaluation.md
tests/                   run-all.sh, selftest-runner.sh, fixtures/runner, e2e/*.py
```

## The character

One stickman, defined once in `src/lib/stickman/poses.json` (proportions, line
weight, face, poses, moods, pencil). `Stickman.tsx` renders the finished pose on
the server; `rig.ts` morphs it between poses at runtime. Poses: idle, drawing,
pointing, waving, falling, seated, seatedPointing. Moods: neutral, smile, smirk,
grin, focus, surprised, grimace, deadpan.

`Rig.life()` gives resting figures a slow breath, an occasional blink and a rare
glance. It only runs while the figure is on screen and never touches the pose.
`Rig.anticipate()` is the small crouch before a bigger move. `mover.ts` walks a
figure across a drawing with transforms only, so walking never triggers layout.

Bible Strong Avatar Lab was evaluated and not used (AGPL-3.0, and a different
visual style); see `docs/avatar-lab-evaluation.md`.

## Animation, scrolling and reduced motion

- Scrolling is always the browser's. Nothing is pinned, nothing hijacks the wheel.
- Parts 02 and 03 are scroll-scrubbed: progress is a pure function of scroll
  position, so animations play identically going down and up.
- Part 04's incident and contact scene are one-shot and button- or tap-triggered; nothing
  overlays the page or locks scrolling. On the drawing pad only, the canvas itself takes touch
  (`touch-action: none`) so a finger can draw; the area around the pad still scrolls.
- Nothing runs when it has nothing to do: Part 03's frame callback removes itself when every drawing
  has caught up with the scroll position, resting figures redraw only the attributes that changed, and
  Part 01's figure stops once Part 02 has taken over.
- A pre-paint script in `layout.tsx` chooses the mode. Reduced motion, Save-Data
  and very low-power devices skip the entrance. It also holds first paint until
  the webfonts load (never longer than 0.9 s) so headings never reflow in view.
- With `prefers-reduced-motion: reduce`: the stickman only changes pose, nothing
  travels, drawings are shown finished, the drawing pad and terminal still work,
  and the incident plays as text.
- Without JavaScript the server-rendered markup is complete: all four projects,
  every link, the contact button and the contact links. Nothing essential is
  hidden until an animation runs.

## The drawing pad

`src/lib/playground/pad.ts` records exactly what the visitor draws and paints it with a standard
midpoint curve. It never recognises, snaps or replaces shapes. Pointer Events (mouse, touch, pen) with
pointer capture; colour, brush size, eraser, undo (button or Ctrl/Cmd+Z), and a two-step Clear (no dialog).
The canvas is rendered at the device pixel ratio (capped at 3). Drawings stay in the page: nothing is
saved or sent. Drawing itself needs a pointer; all controls are keyboard-operable.

## Part 04 safety

The terminal (`src/lib/playground/terminal.ts`) is a pure lookup against four
fixed words — `help`, `about`, `projects`, `coffee`. Input is capped at 24
characters, rendered only as text, never evaluated, never used as an object key,
and never sent anywhere. Anything else answers "command not found". There is no
network request, dialog or shell behind it. `tests/e2e/part4.py` throws twelve
hostile strings at it (including `__proto__`, `constructor`, markup and
`${7*7}`) and checks the DOM, dialogs and network stay untouched.

## Updating content

**Project links, copy, tech tags:** `src/lib/projects/data.ts`. Every fact carries
a source tag (`cv`, `repo`, `site`) and each link a `check` (`repo-verified`,
`reachable`, `cv-listed`). Only add what you can verify. `todo` fields are notes
for the owner and are never rendered.

**Replace a screenshot:** put an image in `public/projects/<project>/` (WebP, about 1600 px wide) and edit that
project's `screenshots` entry in `data.ts` (`src`, `width`, `height`, `alt`, `caption`). Width and height reserve
the space, so there is no layout shift. All four projects now show real screenshots (VRxED Meet, VRxNuro and
Termedu from images supplied by the owner; the Termedu one is a demo account). Only add real screenshots; a
project with none falls back to a clearly labelled illustration.

**Contact details:** `src/lib/playground/data.ts` (`CONTACT`). They come from the
CV; the phone number on the CV is deliberately not published.

**Journey copy:** `src/lib/journey/data.ts`.

## Production build

```bash
npm run build
npm start
```

This is a standard Next.js server build. No hosting provider is configured in
this repository.

## Sound and the living background

- **Sound effects are synthesised in the browser** (Web Audio): click, pop, chime, confirm, key, pencil, whoosh. Each has a
  minimum gap; hovering and moving the mouse make no sound.
- **Muted by default.** Two small buttons (top right) switch sound effects and ambient music on; they are independent.
  Nothing audio is created until the visitor switches something on *and* has interacted with the page. The effects choice and the
  volume are remembered in `localStorage` (`le.sound.v1`). Music is remembered only as "ready" (a small dot) and never plays
  without a click. If audio is missing or blocked the buttons say so and the page is unaffected. The control tucks away while
  scrolling down.
- **Ambient music** is the track in `public/audio/ambient-portfolio.mp3`; see `docs/music.md` (source, format, level, and the
  licence check you still need to do). A quiet generated pad is the fallback if the file cannot be played.
- **Background:** slow drifting hand-drawn lines per section plus a few marks, animated with `transform` only, paused when the
  tab is hidden, still under reduced motion, never receiving clicks.
- Source: `src/lib/sound/`, `src/components/SoundControl.tsx`, `src/components/Ambient.tsx`, `src/app/{sound,ambient,polish}.css`.

## Branding, CV and SEO

- **Favicon:** a static M (`src/app/icon.svg`, `favicon.ico` with 16/32/48 px, `apple-icon.png`). Next picks these up by file name.
  There is no MS favicon: at 16 px the M alone is the readable one.
- **MS monogram:** `src/components/Monogram.tsx` replaces the corner name (the headline keeps the full name). A large M with the S
  laid across its right leg; the S has a paper-coloured outline underneath, so it visibly cuts through the M. The finished mark is
  the default state; the ink-stroke reveal (M, then S) is a CSS animation that only decorates it. Hover nudges the letters and
  shows a blue full stop; a click replays the reveal. Still under reduced motion. On `/cv` it is a plain link home.
- **CV page:** `/cv` (`src/app/cv/`, `src/components/CvViewer.tsx`). "View CV" in the contact area opens it; "Download PDF" is the
  file itself. Wide screens with a pointer embed the PDF (the browser's own renderer, inside the site); phones, touch devices and
  no-JavaScript visitors get a one-page preview image (`public/cv-preview.png`) with download links, and the embed has its own
  fallback text. The file is `public/Milan-Singla-CV.pdf`: a copy of the CV with the phone number, roll number, CGPA and
  percentages removed from the file itself (not covered up). If you update the CV, make a new copy the same way and regenerate
  `cv-preview.png`. The CV still lists the Termedu live link.
- **SEO:** the production address is `https://milansingla.tech`, set as `NEXT_PUBLIC_SITE_URL` in `.env.production`. `src/lib/site.ts`
  is the one place that reads it (https only; localhost and tunnel addresses are refused). It drives: canonical links, Open Graph and
  Twitter cards (image `public/og.png`), the JSON-LD on the homepage (Person and WebSite, only facts from the page or CV, with the
  real LinkedIn and GitHub URLs), `robots.txt` (allows everything, names the sitemap) and `sitemap.xml` (`/` and `/cv`). The home
  canonical is the origin, which Next writes without the trailing slash (the same URL). Hosts that build from the repository pick
  `.env.production` up automatically; if your host injects its own value, it must be `https://milansingla.tech`.
  If the variable were empty none of the address-bearing tags would be emitted.
- **Google Search Console:** add `milansingla.tech` as a property (the Domain type verifies with a DNS TXT record at your registrar;
  the URL-prefix type gives an HTML file or meta tag), then submit `https://milansingla.tech/sitemap.xml` under Sitemaps, use URL
  Inspection on `https://milansingla.tech/` and `/cv`, and watch Pages and Performance over the following weeks. No verification
  token is in this project. Brave Search has no equivalent required step; it follows the same crawlable pages and sitemap.
  Search engines decide whether and when to index; nothing here guarantees a ranking.
- **What helps ranking and what does not depend on the code:** done here are a correct title and description, canonical URLs, the
  sitemap, structured data, the full name in the heading, descriptive project text and image alt text. Outside the code: how
  long the site has been live, links from other sites (LinkedIn, GitHub, your university and project pages should point here), and
  competing pages for the same name.

## Engineering Journal (/blog)

A file-based blog: Markdown in `content/blog/` is validated and rendered to static HTML at build time, with
draft protection, per-article SEO, a sitemap extension and an RSS feed. It ships empty (no placeholder
articles). Full guide, front-matter reference and publishing steps: [docs/blog.md](docs/blog.md); start from
[docs/blog-article-template.md](docs/blog-article-template.md). Tests: `npm run test:unit`, `npm run test:blog`.

## Known limits

- Audio was measured (node counts, envelope levels, rate limits) but never listened to; judge the sound by ear.

- Tested in headless Chromium only. Safari, Firefox, real phones and screen readers have not been tested.
- The Termedu live site (`app.termedu.in`, from the CV) is not linked because it does not work. The project
  keeps its GitHub link.
- The VRxED Meet and VRxNuro repositories hold only production builds, not source (stated on their cards).
- Drawing on the pad needs a pointer (mouse, finger or stylus); there is no keyboard drawing mode.
- The page has no social-preview image: one needs an absolute site URL, which this repository does not know.
- Performance numbers in the project notes come from a headless sandbox, not real devices.
