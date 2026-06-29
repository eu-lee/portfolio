import { useLayoutEffect, useState } from "react";

// Single source of truth for the hero stud grid. BrickCanvas renders the studs
// on this grid. The wire box and the overlaid text are positioned in CSS
// (independent of the studs), so the grid's only job now is to pave the pixels.
//
// Everything is resolved in *device* pixels and the stud is an integer number of
// them. A whole-pixel stud means every stud lands on an exact device-pixel
// boundary and tiles edge-to-edge with its neighbour — no sub-pixel seam for the
// background to bleed through, and no resampling blur.
//
// The wall is sized to *cover* the viewport (rounded up to whole studs) and
// centred, so it bleeds off all four screen edges instead of sitting inside a
// border. The sub-stud overflow is clipped by the hero's overflow:hidden.
export function studGrid(width, height, dpr = 1) {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const deviceW = Math.round(w * dpr);
  const deviceH = Math.round(h * dpr);

  // Target stud count sets the stud *size* (the cap keeps studs from shrinking
  // on very wide screens). Round it to whole device pixels, then fit as many
  // whole studs as the area holds.
  const targetCols = Math.max(40, Math.min(112, Math.round(w / 14)));
  const cell = Math.max(1, Math.round(deviceW / targetCols));
  const fitCols = Math.max(1, Math.floor(deviceW / cell));
  const fitRows = Math.max(1, Math.floor(deviceH / cell));

  const size = cell / dpr; // css px per stud

  // The image is bounded to an inner frame, inset insetStuds from every screen
  // edge. The surrounding border is solid black and the studs fade to black at
  // the frame edges; the wire box sits on those edges. Inset in whole studs so
  // the wires land on stud lines.
  const insetStuds = Math.max(1, Math.round(Math.max(20, Math.min(56, w * 0.03)) / size));
  const columns = Math.max(1, fitCols - insetStuds * 2);
  const rows = Math.max(1, fitRows - insetStuds * 2);

  const deviceWidth = columns * cell;
  const deviceHeight = rows * cell;

  // Centre the inner frame; the leftover device pixels become the black border.
  // Snapped to whole device pixels so the canvas top-left doesn't land on a
  // fractional pixel (which would resample the layer).
  const offsetXDevice = Math.round((deviceW - deviceWidth) / 2);
  const offsetYDevice = Math.round((deviceH - deviceHeight) / 2);
  const offsetX = offsetXDevice / dpr;
  const offsetY = offsetYDevice / dpr;

  const widthCss = deviceWidth / dpr;
  const heightCss = deviceHeight / dpr;

  return {
    columns,
    rows,
    cell, // device px per stud (integer)
    size,
    dpr,
    deviceWidth,
    deviceHeight,
    width: widthCss, // css size of the brick area (the inner frame)
    height: heightCss,
    offsetX, // css offset that centres the inner frame
    offsetY,
    // The wire box sits on the inner frame's edges (= the canvas edges); the
    // header + name text align to the same lines.
    frame: {
      leftPx: offsetX,
      topPx: offsetY,
      rightPx: offsetX + widthCss,
      bottomPx: offsetY + heightCss,
      rightInsetPx: w - (offsetX + widthCss), // black border widths, for
      bottomInsetPx: h - (offsetY + heightCss) // right/bottom-anchored elements
    }
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
