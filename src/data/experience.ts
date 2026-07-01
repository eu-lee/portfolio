import matter from "gray-matter";

// Content for the /experience route lives in content/experience/*.md. One file
// per category; the filename (minus .md) becomes the category key. The left
// panel stacks these categories and their entries, the right CONTENTS rail
// scroll-spies between them.
//
// Field guide (YAML frontmatter):
//   order    number, ascending — controls category order down the page
//   label    heading shown for the category
//   entries  list of { title, sub, meta, win? }
//            win: true highlights an award/placement in the accent yellow.

export type ExperienceEntry = {
  title: string;
  sub: string;
  meta: string;
  win?: boolean;
};

export type ExperienceCategory = {
  key: string;
  label: string;
  entries: ExperienceEntry[];
};

type CategoryFrontmatter = {
  order?: number;
  label: string;
  entries: ExperienceEntry[];
};

const files = import.meta.glob("../../content/experience/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function keyFromPath(path: string): string {
  return path.split("/").pop()!.replace(/\.md$/, "");
}

export const experience: ExperienceCategory[] = Object.entries(files)
  .map(([path, raw]) => {
    const fm = matter(raw).data as CategoryFrontmatter;
    return {
      order: fm.order ?? 0,
      category: {
        key: keyFromPath(path),
        label: fm.label,
        entries: fm.entries ?? [],
      } as ExperienceCategory,
    };
  })
  .sort((a, b) => a.order - b.order)
  .map((entry) => entry.category);
