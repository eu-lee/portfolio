import { useLayoutEffect, useState } from "react";

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

// Measure one element and resolve the grid once, so every consumer shares the
// exact same { columns, rows, size }. Measuring two elements separately and
// rounding each through studGrid's Math.round(w/14) is what let the canvas and
// the nameplate land on different grids under browser zoom — a sub-pixel width
// difference could flip `columns` for one layer but not the other.
export function useStudGrid(ref) {
  const [grid, setGrid] = useState(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      const { columns, rows, size } = studGrid(rect.width, rect.height);
      setGrid({
        columns,
        rows,
        size,
        width: rect.width,
        height: rect.height,
        dpr: window.devicePixelRatio || 1
      });
    };

    measure();

    // CSS-box changes (incl. browser zoom, which reflows layout) come through
    // the observer.
    const observer = new ResizeObserver(measure);
    observer.observe(el);

    // A pure devicePixelRatio change (dragging the window to a monitor with a
    // different density, or some zoom steps) doesn't resize the CSS box, so the
    // observer never fires. Watch the current resolution and re-measure — then
    // re-arm the query for the new dpr, since a media query is bound to a fixed
    // value.
    let media;
    const onDprChange = () => {
      measure();
      arm();
    };
    const arm = () => {
      media?.removeEventListener("change", onDprChange);
      media = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      media.addEventListener("change", onDprChange);
    };
    arm();

    return () => {
      observer.disconnect();
      media?.removeEventListener("change", onDprChange);
    };
  }, [ref]);

  return grid;
}
