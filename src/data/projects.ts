import projectData from "./projects.json";

// Project content lives in projects.json. Each entry drives the left project
// viewer, right rail navigation, and detail dialog.
//
// Field guide:
//   summary      one line, shown in the rail
//   description  array of paragraphs, rendered in the detail dialog
//   links        optional [{ "label": "...", "href": "..." }] actions
//   cover        optional image URL string. Use null for the generated brick
//                board fallback. For uploaded/static images, put files under
//                public/projects/ and use "/projects/your-image.png".

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

export const projects = projectData.projects as Project[];
