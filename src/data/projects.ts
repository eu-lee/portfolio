import matter from "gray-matter";

// Project content lives in content/projects/*.md. One file per project; the
// filename (minus .md) becomes the project id. Each entry drives the left
// project viewer, right rail navigation, and detail dialog.
//
// Field guide (YAML frontmatter):
//   order        optional number — PINS the project to the front of the rail,
//                ascending. Un-pinned projects (no order) sort after all pinned
//                ones, by date (newest first).
//   date         optional date string ("2025-06", "2025-06-15", …). Orders the
//                un-pinned projects; ignored when order is set.
//   summary      one line, shown in the rail
//   links        optional list of { label, href } actions
//   technologies optional list of strings, shown as a tag row under the links
//   cover        optional cover image, used for the rail thumbnail and the large
//                stage. Use null for a blue placeholder box. To use an image,
//                drop the file alongside this .md (directly in content/projects/
//                or in a per-project subfolder) OR in the shared content/images/
//                folder, then reference it by the tail of its path, e.g.
//                cover: tokenstream.png, cover: adify/cover.png, or
//                cover: planthopper.png (matches content/images/planthopper.png).
//                It's bundled
//                and content-hashed by Vite, so a typo fails the build instead of
//                404-ing. A full URL (https://…) is also accepted.
//   video        optional YouTube link (watch, youtu.be, or shorts URL). When
//                set, the large stage and the detail view embed a link-less
//                player in place of the cover. As a convenience a YouTube URL
//                dropped into `cover` is treated the same way — it plays as a
//                video rather than 404-ing as an image.
//   thumbnail    optional rail image (colocated path or full URL, resolved like
//                cover). When absent it falls back to the cover, then the video's
//                poster frame, then the blue placeholder.
// The Markdown body (below the frontmatter) is the description: write plain
// paragraphs separated by a blank line. They render in the detail dialog.

export type ProjectLink = {
  label: string;
  href: string;
};

export type Project = {
  id: string;
  title: string;
  featured?: boolean;
  cover: string | null;
  video?: string;
  // The rail image (resolved URL). Authored via the `thumbnail` frontmatter field
  // — a colocated image path or full URL. When absent it falls back to the cover,
  // then the video's poster frame, then null (blue placeholder). Displayed cropped.
  thumbnail: string | null;
  summary: string;
  description?: string[];
  links?: ProjectLink[];
  technologies?: string[];
  // Authored date (any Date-parseable string, e.g. "2025-06" or "2025-06-15").
  // Drives ordering for un-pinned projects; see the sort below.
  date?: string;
  // Derived: `date` formatted for display, e.g. "Feb 2026". Undefined when the
  // date is absent or unparseable.
  dateLabel?: string;
};

type ProjectFrontmatter = Omit<Project, "id" | "description" | "thumbnail"> & {
  order?: number;
  // Raw authored value: an image path (colocated, like `cover`) or full URL.
  thumbnail?: string;
};

// Vite inlines every markdown file as a raw string at build time.
const files = import.meta.glob("../../content/projects/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

// Images referenceable from `cover` / `thumbnail`. Two locations are scanned:
//   - content/projects/**  — colocated with a .md (directly or in a subfolder)
//   - content/images/**     — a shared image folder for assets reused or kept
//                             outside the projects tree
// Vite resolves each to its final hashed URL; we look them up by the tail of
// their path from the frontmatter value (see resolveCover).
const covers = {
  ...import.meta.glob("../../content/projects/**/*.{png,jpg,jpeg,gif,webp,avif,svg}", {
    import: "default",
    eager: true,
  }),
  ...import.meta.glob("../../content/images/**/*.{png,jpg,jpeg,gif,webp,avif,svg}", {
    import: "default",
    eager: true,
  }),
} as Record<string, string>;

function idFromPath(path: string): string {
  return path.split("/").pop()!.replace(/\.md$/, "");
}

// Resolve a frontmatter `cover` value to a usable URL: null stays null (brick
// fallback), a full URL passes through, and a bare filename maps to the
// colocated, bundled image. A missing file degrades to the black-box
// placeholder (and warns) rather than throwing — a bad/absent cover should
// never take the whole site down.
function resolveCover(cover: string | null | undefined): string | null {
  if (!cover) return null;
  if (/^https?:\/\//.test(cover)) return cover;
  const match = Object.entries(covers).find(([path]) => path.endsWith(`/${cover}`));
  if (!match) {
    console.warn(
      `Project cover "${cover}" not found in content/projects/ or content/images/; using placeholder.`,
    );
    const placeholder = Object.entries(covers).find(([path]) => path.endsWith("/placeholder.svg"));
    return placeholder ? placeholder[1] : null;
  }
  return match[1];
}

// Pull the 11-char id out of any common YouTube URL (watch?v=, youtu.be/,
// /shorts/, /embed/). Returns null for non-YouTube or unrecognized values.
function youTubeId(video: string | null | undefined): string | null {
  if (!video) return null;
  const match = video.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  );
  return match ? match[1] : null;
}

// Embeddable player URL. A recognized YouTube link becomes a link-less /embed/
// URL (rel=0 keeps "related" videos to this channel, modestbranding trims the
// chrome); anything else passes through so a direct embed URL still works (a bad
// link surfaces as a broken iframe, not a build failure).
function resolveVideo(video: string | null | undefined): string | undefined {
  if (!video) return undefined;
  const id = youTubeId(video);
  return id ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1` : video;
}

// Rail image: the authored `thumbnail` if set (resolved like a cover — a
// colocated image path or full URL), else the cover, else the video's YouTube
// poster frame, else null (blue placeholder). hqdefault always exists for a
// valid id.
function resolveThumbnail(
  thumbnail: string | null | undefined,
  cover: string | null,
  video: string | null | undefined,
): string | null {
  if (thumbnail) return resolveCover(thumbnail);
  if (cover) return cover;
  const id = youTubeId(video);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

// Parse an authored date to a sortable timestamp; unparseable/missing dates sort
// oldest (0) so they land at the very back of the un-pinned group.
function dateValue(date: string | null | undefined): number {
  if (!date) return 0;
  const t = Date.parse(date);
  return Number.isNaN(t) ? 0 : t;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Format an authored date for display, e.g. "Feb 2026". Uses UTC so a bare
// "2026-02" (parsed as UTC midnight) doesn't slip to the previous month in
// negative-offset timezones. Undefined when absent/unparseable.
function formatDate(date: string | null | undefined): string | undefined {
  if (!date) return undefined;
  const t = Date.parse(date);
  if (Number.isNaN(t)) return undefined;
  const d = new Date(t);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function toParagraphs(body: string): string[] {
  return body
    .trim()
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

export const projects: Project[] = Object.entries(files)
  .map(([path, raw]) => {
    const { data, content } = matter(raw);
    const fm = data as ProjectFrontmatter;
    const description = toParagraphs(content);
    // A YouTube URL is accepted in either `video` or `cover`. Either way it
    // drives the embedded player; a YouTube link in `cover` is NOT treated as an
    // image, so the cover image slot stays empty and the video wins.
    const videoSource = fm.video ?? (youTubeId(fm.cover) ? fm.cover : undefined);
    const cover = resolveCover(youTubeId(fm.cover) ? null : fm.cover);
    return {
      order: fm.order,
      date: fm.date,
      project: {
        id: idFromPath(path),
        title: fm.title,
        featured: fm.featured,
        cover,
        video: resolveVideo(videoSource),
        thumbnail: resolveThumbnail(fm.thumbnail, cover, videoSource),
        summary: fm.summary,
        description: description.length ? description : undefined,
        links: fm.links,
        technologies: fm.technologies,
        date: fm.date,
        dateLabel: formatDate(fm.date),
      } as Project,
    };
  })
  // Ordering is a two-tier "pin" scheme. Projects WITH an explicit `order` are
  // pinned to the front, sorted by that number ascending. Everything else falls
  // in behind them, newest `date` first (undated projects sort last).
  .sort((a, b) => {
    const aPinned = a.order != null;
    const bPinned = b.order != null;
    if (aPinned && bPinned) return a.order! - b.order!;
    if (aPinned !== bPinned) return aPinned ? -1 : 1;
    return dateValue(b.date) - dateValue(a.date);
  })
  .map((entry) => entry.project);
