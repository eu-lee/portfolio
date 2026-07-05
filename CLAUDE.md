# CLAUDE.md

Personal portfolio site for Eugene Lee. React 19 + Vite + TypeScript, no UI
framework — the whole thing is one hand-built shell (`src/App.tsx`) styled by one
stylesheet (`src/styles.css`). Content is authored as Markdown in `content/` and
loaded at build time, so adding/editing projects never touches component code.

## Commands

- `npm run dev` — Vite dev server
- `npm run typecheck` — `tsc --noEmit`
- `npm run build` — typecheck + Vite production build (a bad content reference,
  e.g. a mistyped cover filename, fails the build rather than 404-ing at runtime)
- `npm run preview` — serve the built `dist/`

Always `npm run build` (or at least `typecheck`) before calling a change done.

## Vocabulary (use these terms when discussing the UI)

- **Large fonts** — the oversized display type: project **titles** (the active
  project on the projects stage, and each rail entry's name) and the hero
  nameplate **"EUGENE LEE"** on the home page. Both the hero nameplate and the
  project titles use Instrument Serif (400).
- **Navbar** — the section links (`home` / `about` / `projects`) pinned to the
  **top-right** of the frame (`.hero-nav` / `.hero-links`).
- **Right column** — the right-hand cell of the frame. On projects it holds the
  index **rail**; on home/about it's where the navbar and contact icons live.
- **Middle wire** — the vertical divider line separating the main content area
  (left) from the right column. In code it's the `is-nav-down` frame line, placed
  at the measured `navWireX`. ("right column / middle wire" both refer here.)

## Architecture

Single-page app with three client-side routes — `home`, `about`, `projects` —
driven by `window.location.pathname` (no router lib). One persistent `<Portfolio>`
shell renders all three; routes **cross-fade** rather than remount, so the wire
frame is measured/drawn once and never redraws on navigation.

**Layering** (z-index): the shell splits into a **background layer** (`.page-bg`,
z1, the animated mosaic), the **wire frame** (`.hero-frame`, z2, drawn once), and
**foreground layers** (`.page-fg`, z3 — one per route: home name/tagline, projects
stage+rail, about panel). Only the active foreground is interactive.

- **`src/App.tsx`** — the whole shell: routing, the persistent frame + navbar +
  contact row, and all three route layers. Also the projects interaction model:
  the left **stage** (active project, large) and the right **rail** (a native
  momentum scroller whose scroll progress maps to which entry is active). Read the
  block comments here first — the scroll/glide hysteresis and the measured
  `stageLead` / `navWireX` positioning are subtle.
- **`src/lib/heroGrid.ts`** — `useStudGrid` measures the viewport into a stud grid
  and resolves the wire-frame corner positions (the `--wire-*` CSS vars). Both the
  frame and the mosaic snap to whole studs off this.
- **`src/components/BrickCanvas.tsx`** — renders the background as a wall of LEGO
  studs sampled from an image/GIF, on a `<canvas>`. Props of note: `active`
  (whether the GIF animation loop runs) and `slowdown` (GIF playback multiplier —
  read live from a ref so changing it re-times the *next* frame in place instead
  of restarting the GIF from frame 0). The mosaic is full-bleed on **every** route
  now; on about/projects a `.page-bg::after` veil (`--bg-dim`) dims it, and the
  GIF is slowed (`slowdown` in App.tsx).
- **`src/data/projects.ts`** & **`legoColors.ts`** — build-time loaders. Projects
  are read from `content/projects/*.md` via `gray-matter`; see the field guide at
  the top of the file.
- **`src/styles.css`** — everything visual. Sizing is viewport-driven: prefer
  `clamp(min, min(Nvw, Msvh), max)` so type/padding scale on large screens (match
  the surrounding rules rather than hardcoding px).

## Content (`content/`)

Editing text/images means editing `content/`, not `src/` — see
[`content/README.md`](content/README.md).

- `content/projects/<id>.md` — one file per project; filename is the id, YAML
  frontmatter drives the UI, Markdown body is the description. `order` pins to the
  front of the rail ascending; un-pinned sort by `date` (newest first).
- `content/about/index.md` — the about page (small Markdown subset: headings,
  paragraphs, links, inline `![icon](icons/…)`).
- `content/backgrounds/` — hero/background media; the active one is imported in
  `src/App.tsx` (currently `bkg4.gif`).

## Conventions

- Match the existing style: heavy explanatory block comments over *why* the
  tricky layout/animation code is shaped the way it is — preserve them when
  editing, and add one when introducing another non-obvious measurement or timing.
- Route-conditional behavior keys off `isHome` / `isProjects` / `isAbout` in
  `App.tsx` and the `is-<route>` class on `.hero` in CSS.
- No test suite; verify visually with `npm run dev` and keep the build green.
