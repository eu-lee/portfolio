// Project content lives here — each entry drives both the grid card and the
// detail dialog.
//
// Field guide:
//   summary      one line, shown where space is tight
//   description  array of paragraphs, rendered in the detail dialog
//   links        optional [{ label, href }] action links in the dialog
//   cover        optional imported image; falls back to the procedural brick
//                board when absent. To use one, drop a file in
//                src/assets/projects/ and import it, e.g.
//                  import tokenstreamCover from "../assets/projects/tokenstream.png";
//                then set `cover: tokenstreamCover` below.

export const projects = [
  {
    id: "attention-atlas",
    title: "Attention Atlas",
    subtitle: "Transformer attention explorer",
    kind: "Live demo",
    category: "ml",
    accent: "orange",
    board: "heat",
    cover: null,
    summary: "Transformer attention, made legible head by head.",
    description: [
      "Attention Atlas is a visual tool for inspecting how transformer models route information — surfacing per-head attention patterns, token focus, and how behavior shifts layer by layer.",
      "Load a sequence and step through the stack to see which tokens each head attends to, compare heads side by side, and build intuition for the structures that emerge inside a trained model."
    ],
    links: [
      { label: "Live demo", href: "#" },
      { label: "Source", href: "#" }
    ],
    stack: ["Transformers", "Visualization", "TypeScript"]
  },
  {
    id: "graph-pathfinder",
    title: "Graph Pathfinder",
    subtitle: "A* and Dijkstra visualizer",
    kind: "Live demo",
    category: "algorithms",
    accent: "azure",
    board: "graph",
    featured: true,
    cover: null,
    summary: "Watch A* and Dijkstra race across a weighted grid.",
    description: [
      "Graph Pathfinder is an interactive playground for shortest-path search. Draw walls, drop weighted terrain, and run A* or Dijkstra to watch the frontier expand in real time.",
      "Side-by-side runs make the tradeoffs concrete: how the heuristic reshapes A*'s search, where Dijkstra spends its effort, and what changes when edges aren't uniform."
    ],
    links: [
      { label: "Live demo", href: "#" },
      { label: "Source", href: "#" }
    ],
    stack: ["Algorithms", "Canvas", "Data Structures"]
  },
  {
    id: "tokenstream",
    title: "TokenStream",
    subtitle: "Tiny LLM inference engine",
    kind: "Project",
    category: "systems",
    accent: "green",
    board: "layers",
    cover: null,
    summary: "A tiny, readable LLM inference engine.",
    description: [
      "TokenStream is a compact inference pipeline built to be read. It focuses on the parts that matter for throughput — token flow, batching, and KV-cache behavior — without the layers of abstraction that hide them.",
      "The internals are deliberately small and annotated, so you can trace a request from prompt to generated token and see exactly where time and memory go."
    ],
    links: [
      { label: "Source", href: "#" }
    ],
    stack: ["Systems", "LLMs", "Performance"]
  },
  {
    id: "sortlab",
    title: "SortLab",
    subtitle: "Sorting algorithm playground",
    kind: "Project",
    category: "algorithms",
    accent: "blue",
    board: "bars",
    cover: null,
    summary: "See comparisons, swaps, and complexity emerge live.",
    description: [
      "SortLab runs sorting algorithms side by side so you can watch comparisons and swaps play out in real time, with the cost of each approach made visible as it works.",
      "It's built for teaching: tune the input, slow the animation down, and connect what you see on screen to the underlying complexity."
    ],
    links: [
      { label: "Live demo", href: "#" },
      { label: "Source", href: "#" }
    ],
    stack: ["Algorithms", "Animation", "Education"]
  }
];

export const filters = [
  { id: "all", label: "All" },
  { id: "ml", label: "ML" },
  { id: "algorithms", label: "Algorithms" },
  { id: "systems", label: "Systems" }
];
