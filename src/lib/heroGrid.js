// Single source of truth for the hero stud grid. BrickCanvas renders the studs
// on this grid, and Nameplate snaps its tile plate onto the exact same cells —
// both must derive their layout from here so they stay aligned.
export function studGrid(width, height) {
  const w = Math.ceil(width);
  const h = Math.ceil(height);
  const columns = Math.max(40, Math.min(112, Math.round(w / 14)));
  const size = w / columns;
  const rows = Math.ceil(h / size);
  return { columns, rows, size };
}
