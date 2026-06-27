import { useLayoutEffect, useState } from "react";

// Studs of clearance between the wall and each screen edge. The leftover sub-stud
// remainder is added on top, so the frame both fits perfectly and sits this many
// studs in from every side. Must be a multiple of 0.5 so the total studs removed
// (INSET_STUDS * 2) stays whole and the cells stay integer.
const INSET_STUDS = 1.5;

// Single source of truth for the hero stud grid. BrickCanvas renders the studs
// on this grid, and Nameplate snaps its tile plate onto the exact same cells —
// both must derive their layout from here so they stay aligned.
//
// Everything is resolved in *device* pixels and the stud is an integer number of
// them. A whole-pixel stud means every stud lands on an exact device-pixel
// boundary and tiles edge-to-edge with its neighbour — no sub-pixel seam for the
// azure background to bleed through, and no resampling blur. The few device
// pixels left over (width/height that don't divide evenly into whole studs) are
// reported as offsetX/offsetY so the wall can be centred, leaving a thin uniform
// border that absorbs the remainder and reframes itself at every size / DPR.
export function studGrid(width, height, dpr = 1) {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const deviceW = Math.round(w * dpr);
  const deviceH = Math.round(h * dpr);

  // Target stud count sets the stud *size* (the cap keeps studs from shrinking —
  // and the nameplate from ballooning — on very wide screens). Round it to whole
  // device pixels, then fit as many whole studs as the area actually holds.
  const targetCols = Math.max(40, Math.min(112, Math.round(w / 14)));
  const cell = Math.max(1, Math.round(deviceW / targetCols));
  const fitCols = Math.max(1, Math.floor(deviceW / cell));
  const fitRows = Math.max(1, Math.floor(deviceH / cell));

  // Pull the wall in by INSET_STUDS whole studs on every side. Combined with the
  // centred sub-stud remainder, each border ends up exactly INSET_STUDS*cell + x
  // wide (x = the leftover before the next full stud) — a clean, even frame whose
  // edges land on whole device pixels so the white wires stay crisp.
  const columns = Math.max(1, fitCols - INSET_STUDS * 2);
  const rows = Math.max(1, fitRows - INSET_STUDS * 2);

  const deviceWidth = columns * cell;
  const deviceHeight = rows * cell;

  // Snap the centring offset to a whole device pixel too, so the canvas's own
  // top-left doesn't land on a fractional device pixel (which would let the
  // browser resample the whole layer and undo the crispness).
  const offsetXDevice = Math.floor((deviceW - deviceWidth) / 2);
  const offsetYDevice = Math.floor((deviceH - deviceHeight) / 2);

  return {
    columns,
    rows,
    cell, // device px per stud (integer)
    size: cell / dpr, // css px per stud, for layout consumers (the nameplate)
    dpr,
    deviceWidth,
    deviceHeight,
    width: deviceWidth / dpr, // css size of the brick area
    height: deviceHeight / dpr,
    offsetX: offsetXDevice / dpr, // css inset that centres the fitted wall
    offsetY: offsetYDevice / dpr
  };
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
      setGrid(studGrid(rect.width, rect.height, window.devicePixelRatio || 1));
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
