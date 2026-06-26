export const projects = [
  {
    id: "attention-atlas",
    title: "Attention Atlas",
    subtitle: "Transformer attention explorer",
    kind: "Live demo",
    category: "ml",
    accent: "orange",
    board: "heat",
    summary:
      "A visual tool for inspecting transformer attention heads, token focus, and layer-by-layer behavior.",
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
    summary:
      "An interactive pathfinding playground that compares frontier growth, weighted edges, and shortest-path tradeoffs.",
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
    summary:
      "A compact inference pipeline focused on token flow, batching, cache behavior, and readable internals.",
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
    summary:
      "A side-by-side sorter for seeing comparisons, swaps, and complexity emerge in real time.",
    stack: ["Algorithms", "Animation", "Education"]
  }
];

export const filters = [
  { id: "all", label: "All" },
  { id: "ml", label: "ML" },
  { id: "algorithms", label: "Algorithms" },
  { id: "systems", label: "Systems" }
];
