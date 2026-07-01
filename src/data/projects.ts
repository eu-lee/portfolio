import matter from "gray-matter";

// Project content lives in content/projects/*.md. One file per project; the
// filename (minus .md) becomes the project id. Each entry drives the left
// project viewer, right rail navigation, and detail dialog.
//
// Field guide (YAML frontmatter):
//   order        number, ascending — controls position in the rail
//   summary      one line, shown in the rail
//   links        optional list of { label, href } actions
//   cover        optional image URL. Use null for the generated brick board
//                fallback. For static images, put files under public/projects/
//                and use "/projects/your-image.png".
// The Markdown body (below the frontmatter) is the description: write plain
// paragraphs separated by a blank line. They render in the detail dialog.

export type BoardType = "heat" | "layers" | "bars" | "graph";

export type ProjectLink = {
  label: string;
  href: string;
};

export type Project = {
  id: string;
  title: string;
  subtitle: string;
  board: BoardType;
  featured?: boolean;
  cover: string | null;
  summary: string;
  description?: string[];
  links?: ProjectLink[];
};

type ProjectFrontmatter = Omit<Project, "id" | "description"> & { order?: number };

// Vite inlines every markdown file as a raw string at build time.
const files = import.meta.glob("../../content/projects/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function idFromPath(path: string): string {
  return path.split("/").pop()!.replace(/\.md$/, "");
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
    return {
      order: fm.order ?? 0,
      project: {
        id: idFromPath(path),
        title: fm.title,
        subtitle: fm.subtitle,
        board: fm.board,
        featured: fm.featured,
        cover: fm.cover ?? null,
        summary: fm.summary,
        description: description.length ? description : undefined,
        links: fm.links,
      } as Project,
    };
  })
  .sort((a, b) => a.order - b.order)
  .map((entry) => entry.project);
