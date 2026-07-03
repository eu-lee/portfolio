import matter from "gray-matter";

// Project content lives in content/projects/*.md. One file per project; the
// filename (minus .md) becomes the project id. Each entry drives the left
// project viewer, right rail navigation, and detail dialog.
//
// Field guide (YAML frontmatter):
//   order        number, ascending — controls position in the rail
//   summary      one line, shown in the rail
//   links        optional list of { label, href } actions
//   cover        optional cover image, used for the rail thumbnail and the large
//                stage. Use null for a blue placeholder box. To use an image,
//                drop the file alongside this .md in content/projects/ and
//                reference it by filename, e.g. cover: tokenstream.png — it's
//                bundled and content-hashed by Vite, so a typo fails the build
//                instead of 404-ing. A full URL (https://…) is also accepted.
//   video        optional YouTube link (watch, youtu.be, or shorts URL). When
//                set, the detail view embeds the player instead of the cover.
// The Markdown body (below the frontmatter) is the description: write plain
// paragraphs separated by a blank line. They render in the detail dialog.

export type ProjectLink = {
  label: string;
  href: string;
};

export type Project = {
  id: string;
  title: string;
  subtitle: string;
  featured?: boolean;
  cover: string | null;
  video?: string;
  // Derived, not authored: the rail/stage image. It's the cover if set, else the
  // video's poster frame, else null (blue placeholder). Displayed cropped.
  thumbnail: string | null;
  summary: string;
  description?: string[];
  links?: ProjectLink[];
};

type ProjectFrontmatter = Omit<Project, "id" | "description" | "thumbnail"> & { order?: number };

// Vite inlines every markdown file as a raw string at build time.
const files = import.meta.glob("../../content/projects/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

// Cover images colocated with the .md files. Vite resolves each to its final
// hashed URL; we look them up by filename from the `cover` frontmatter.
const covers = import.meta.glob("../../content/projects/*.{png,jpg,jpeg,gif,webp,avif,svg}", {
  import: "default",
  eager: true,
}) as Record<string, string>;

function idFromPath(path: string): string {
  return path.split("/").pop()!.replace(/\.md$/, "");
}

// Resolve a frontmatter `cover` value to a usable URL: null stays null (brick
// fallback), a full URL passes through, and a bare filename maps to the
// colocated, bundled image.
function resolveCover(cover: string | null | undefined): string | null {
  if (!cover) return null;
  if (/^https?:\/\//.test(cover)) return cover;
  const match = Object.entries(covers).find(([path]) => path.endsWith(`/${cover}`));
  if (!match) {
    throw new Error(`Project cover "${cover}" not found in content/projects/`);
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

// Embeddable player URL. A recognized YouTube link becomes an /embed/ URL;
// anything else passes through so a direct embed URL still works (a bad link
// surfaces as a broken iframe, not a build failure).
function resolveVideo(video: string | null | undefined): string | undefined {
  if (!video) return undefined;
  const id = youTubeId(video);
  return id ? `https://www.youtube.com/embed/${id}` : video;
}

// Rail/stage image: the cover if set, else the video's YouTube poster frame,
// else null (blue placeholder). hqdefault always exists for a valid id.
function resolveThumbnail(cover: string | null, video: string | null | undefined): string | null {
  if (cover) return cover;
  const id = youTubeId(video);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
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
    const cover = resolveCover(fm.cover);
    return {
      order: fm.order ?? 0,
      project: {
        id: idFromPath(path),
        title: fm.title,
        subtitle: fm.subtitle,
        featured: fm.featured,
        cover,
        video: resolveVideo(fm.video),
        thumbnail: resolveThumbnail(cover, fm.video),
        summary: fm.summary,
        description: description.length ? description : undefined,
        links: fm.links,
      } as Project,
    };
  })
  .sort((a, b) => a.order - b.order)
  .map((entry) => entry.project);
