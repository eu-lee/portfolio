import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { studGrid } from "../lib/heroGrid.js";

// The nameplate is a procedurally tiled LEGO "plate": the Projects button
// reserves a 2x4 slab and the rest of the grid is paved edge-to-edge with flat
// tiles drawn from the footprint set below. Each tile is shaded and seamed like
// a stud base plate (light top-left catch, dark bottom-right groove), just
// without the raised stud on top.

const COLS = 40;
const ROWS = 20;

// Footprints grouped by priority (w = columns, h = rows). At each open cell the
// packer tries 2x4 first to maximize those, then 1x4, then 1x2, then 1x1 to
// fill whatever is left. Orientations within a group are tried in random order
// so the bond pattern doesn't come out perfectly regular.
const PIECE_GROUPS = [
  [{ w: 4, h: 2 }, { w: 2, h: 4 }], // 2x4
  [{ w: 4, h: 1 }, { w: 1, h: 4 }], // 1x4
  [{ w: 2, h: 1 }, { w: 1, h: 2 }], // 1x2
  [{ w: 1, h: 1 }] // 1x1
];

// Every plate is the same white; its color, shading, and seams are all defined
// in CSS (.tile), kept uniform so a 2x4 slab reads identically to a 1x1.

// 2x4 Projects button, parked in the lower-right of the interior.
const BUTTON = { r: ROWS - 4, c: COLS - 7, w: 4, h: 2 };

// Cells of clearance from the hero's left/bottom edges when snapping the plate.
const MARGIN = 3;

// Small deterministic PRNG so the layout is stable across renders.
function mulberry32(seed) {
  let a = seed;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canPlace(occupied, r, c, footprint) {
  if (c + footprint.w > COLS || r + footprint.h > ROWS) return false;
  for (let dr = 0; dr < footprint.h; dr += 1) {
    for (let dc = 0; dc < footprint.w; dc += 1) {
      if (occupied[(r + dr) * COLS + (c + dc)]) return false;
    }
  }
  return true;
}

// Greedy by priority: place the first piece that fits, biggest group first, so
// 2x4s are maximized before falling back to smaller plates.
function chooseFootprint(occupied, r, c, rng) {
  for (const group of PIECE_GROUPS) {
    const ordered = group.length > 1 && rng() < 0.5 ? [group[1], group[0]] : group;
    for (const footprint of ordered) {
      if (canPlace(occupied, r, c, footprint)) return footprint;
    }
  }
  return { w: 1, h: 1 };
}

function buildPlate() {
  const occupied = new Uint8Array(COLS * ROWS);
  const tiles = [];
  const mark = (r, c) => {
    occupied[r * COLS + c] = 1;
  };

  // Reserve the button slab so the packer fills around it.
  for (let dr = 0; dr < BUTTON.h; dr += 1) {
    for (let dc = 0; dc < BUTTON.w; dc += 1) mark(BUTTON.r + dr, BUTTON.c + dc);
  }

  // Pave the whole grid, always filling the top-left-most open cell.
  const rng = mulberry32(0x1234abcd);
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      if (occupied[r * COLS + c]) continue;
      const footprint = chooseFootprint(occupied, r, c, rng);
      for (let dr = 0; dr < footprint.h; dr += 1) {
        for (let dc = 0; dc < footprint.w; dc += 1) mark(r + dr, c + dc);
      }
      tiles.push({ r, c, w: footprint.w, h: footprint.h });
    }
  }

  return tiles;
}

const area = (tile) => `${tile.r + 1} / ${tile.c + 1} / span ${tile.h} / span ${tile.w}`;

export function Nameplate({ onNavigate }) {
  const tiles = useMemo(buildPlate, []);
  const ref = useRef(null);
  const [box, setBox] = useState(null);

  // Snap the plate onto a COLS x ROWS block of the stud grid behind it: same
  // cell size, top-left on an exact cell boundary, anchored near bottom-left.
  useLayoutEffect(() => {
    const hero = ref.current?.parentElement;
    if (!hero) return undefined;

    const measure = () => {
      const rect = hero.getBoundingClientRect();
      const { columns, rows, size } = studGrid(rect.width, rect.height);
      const col = Math.max(0, Math.min(MARGIN, columns - COLS));
      const row = Math.max(0, rows - ROWS - MARGIN);
      setBox({
        left: col * size,
        top: row * size,
        width: COLS * size,
        height: ROWS * size
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="nameplate"
      ref={ref}
      style={
        box
          ? { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px` }
          : { visibility: "hidden" }
      }
    >
      {tiles.map((tile) => (
        <span
          className="tile"
          key={`${tile.r}-${tile.c}`}
          style={{ gridArea: area(tile) }}
          aria-hidden="true"
        />
      ))}

      <a
        className="tile-button"
        style={{ gridArea: area(BUTTON) }}
        href="/projects"
        onClick={(event) => {
          event.preventDefault();
          onNavigate("/projects");
        }}
      >
        Projects
      </a>

      <div className="nameplate-text">
        <p className="eyebrow">Software Engineering · University of Waterloo</p>
        <h1>Eugene Lee</h1>
        <p>Algorithms, machine learning, and transformers — assembled one piece at a time.</p>
      </div>
    </div>
  );
}
