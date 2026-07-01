# Content

Everything editable about the site lives here — text and images together. The
loaders in `src/data/` read these files at build time; no component code needs
to change to add, edit, or reorder entries.

```
content/
  projects/      one <id>.md per project (+ optional colocated cover images)
  experience/    one <key>.md per category
  backgrounds/   hero/background media
```

## Projects — `content/projects/<id>.md`

The filename (minus `.md`) is the project id. YAML frontmatter drives the UI;
the Markdown body is the description (blank-line-separated paragraphs).

```markdown
---
order: 2                 # ascending — position in the rail
title: Graph Pathfinder
subtitle: A* and Dijkstra visualizer
board: graph             # heat | layers | bars | graph
featured: true
cover: null              # null → generated brick board; or a filename; or a URL
summary: Watch A* and Dijkstra race across a weighted grid.
links:
  - label: Live demo
    href: "#"
---

First description paragraph.

Second description paragraph.
```

**Covers:** drop the image next to the `.md` (e.g. `graph-pathfinder.png`) and
set `cover: graph-pathfinder.png`. It's bundled and content-hashed by Vite, so a
typo fails the build instead of 404-ing. A full `https://…` URL also works.

## Experience — `content/experience/<key>.md`

Frontmatter only (these are short labels, not prose). The filename is the
category key.

```markdown
---
order: 3
label: Hackathons
entries:
  - title: Motion
    sub: Modular notes app
    meta: 🥇 1ST · YVRHACKS
    win: true
---
```

## Backgrounds — `content/backgrounds/`

Media imported directly by the app (currently `bkg4.gif` as the hero
background). Swap the file or repoint the import in `src/App.tsx`.
