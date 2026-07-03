# Content

Everything editable about the site lives here — text and images together. The
loaders in `src/data/` read these files at build time; no component code needs
to change to add, edit, or reorder entries.

```
content/
  about/         markdown and inline icons for the /about page
  projects/      one <id>.md per project (+ optional colocated cover images)
  backgrounds/   hero/background media
```

## About — `content/about/index.md`

The about page renders a small Markdown subset:

- `# Heading`
- paragraphs separated by blank lines
- links like `[projects](/projects)` or `[GitHub](https://github.com/eu-lee)`
- inline icons like `![Waterloo](icons/waterloo.svg)`

Local about icons live in `content/about/icons/`, so they are referenced from
Markdown with relative paths such as `icons/eureka.svg`.

## Projects — `content/projects/<id>.md`

The filename (minus `.md`) is the project id. YAML frontmatter drives the UI;
the Markdown body is the description (blank-line-separated paragraphs).

```markdown
---
order: 2                 # ascending — position in the rail
title: Graph Pathfinder
subtitle: A* and Dijkstra visualizer
featured: true
cover: null              # null → blue placeholder; or a filename; or a URL
video: null              # optional YouTube link; embedded on the detail view
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

## Backgrounds — `content/backgrounds/`

Media imported directly by the app (currently `bkg4.gif` as the hero
background). Swap the file or repoint the import in `src/App.tsx`.
