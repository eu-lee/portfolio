# Projects page — wire-in patch (option 6a)

Two files replace the old card-grid `/projects` page with the wireframe catalogue.

## Apply

1. **src/App.tsx** — replace the entire existing `function Projects({ onOpenProject }: ProjectsProps) { … }`
   with the function in `Projects.tsx`. No new imports needed: `navigateTo`, `filters`,
   `projects`, `FilterId`, `Project`, and `BrickGrid` are already in scope.

2. **src/styles.css** — append the whole of `projects-page.css` to the end.

3. The route already exists (`path === "/projects"` in `App`). The wrapper
   `<main className="app-shell projects-shell">` stays as-is; `.wf-page` paints
   the full frame inside it. If `projects-shell`/`app-shell` adds its own padding,
   remove it for that route so the frame sits flush.

## Notes

- Renders your real 4 projects from `src/data/projects.ts`. Add more entries there
  and the grid scrolls — header, title/filters, and right rail stay pinned.
- Brick covers use the existing `<BrickGrid>` (procedural). Drop a real image into
  `src/assets/projects/` and set `cover:` on a project to override it.
- No footer bar — matches the hero (socials/location live only on the home page).
- Accent tags read `var(--orange|azure|green|blue)`, the same vars the dialog uses.
