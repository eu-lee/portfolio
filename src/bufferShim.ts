import { Buffer } from "buffer";

// gray-matter (used to parse the content/*.md frontmatter) is a Node library
// that reaches for the global Buffer. This runs as an import side effect so the
// global is in place before any content module calls matter(). Keep this
// imported first, above anything that pulls in src/data/*.
const g = globalThis as typeof globalThis & { Buffer?: typeof Buffer };
g.Buffer = g.Buffer ?? Buffer;
