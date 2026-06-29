import { useMemo } from "react";

// The nameplate is a procedurally tiled LEGO "plate": the Projects button
// reserves a 2x4 slab and the rest of the grid is paved edge-to-edge with flat
// tiles drawn from the footprint set below. Each tile is shaded and seamed like
// a stud base plate (light top-left catch, dark bottom-right groove), just
// without the raised stud on top.
//
// The plate is a fixed COLS wide and spans the *full height of the wall* — it is
// snapped onto the leftmost COLS columns of the shared stud grid, top edge flush
// with the wall's top and bottom edge flush with its bottom. Its row count is
// therefore the grid's row count, resolved per render.

// Exported so the hero can place a divider wire at the plate's right edge and
// pan the photo out from under it; this is the shared width contract.
export const NAMEPLATE_COLS = 20;

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

// Inline brand glyphs for the icon plates.
const ICONS = {
  github: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58l-.02-2.05c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.39 1.24-3.23-.13-.3-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.25 2.88.12 3.18.77.84 1.24 1.91 1.24 3.23 0 4.63-2.81 5.65-5.49 5.95.43.37.82 1.1.82 2.22l-.01 3.29c0 .32.21.7.82.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z" />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  )
};

// A left-aligned row of colored "plate" buttons along the bottom: a wide text
// plate for Projects, then square 2x2 icon plates for GitHub and LinkedIn. The
// packer reserves these footprints and fills the rest around them. Buttons are 2
// studs tall and pinned to the plate's bottom (one stud of tiles sits below),
// regardless of how tall the plate grows.
function buildButtons(rows) {
  const buttonRow = Math.max(0, rows - 3);
  return [
    { id: "projects", label: "Projects", href: "/projects", internal: true, bg: "var(--azure)", ink: "#08263c", r: buttonRow, c: 1, w: 6, h: 2 },
    { id: "github", label: "GitHub", icon: "github", href: "#", bg: "#f1e6c8", ink: "#1b2530", r: buttonRow, c: 8, w: 2, h: 2 },
    { id: "linkedin", label: "LinkedIn", icon: "linkedin", href: "#", bg: "#f1e6c8", ink: "#1e5aa8", r: buttonRow, c: 11, w: 2, h: 2 }
  ];
}

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

function canPlace(occupied, r, c, footprint, rows) {
  if (c + footprint.w > NAMEPLATE_COLS || r + footprint.h > rows) return false;
  for (let dr = 0; dr < footprint.h; dr += 1) {
    for (let dc = 0; dc < footprint.w; dc += 1) {
      if (occupied[(r + dr) * NAMEPLATE_COLS + (c + dc)]) return false;
    }
  }
  return true;
}

// Greedy by priority: place the first piece that fits, biggest group first, so
// 2x4s are maximized before falling back to smaller plates.
function chooseFootprint(occupied, r, c, rng, rows) {
  for (const group of PIECE_GROUPS) {
    const ordered = group.length > 1 && rng() < 0.5 ? [group[1], group[0]] : group;
    for (const footprint of ordered) {
      if (canPlace(occupied, r, c, footprint, rows)) return footprint;
    }
  }
  return { w: 1, h: 1 };
}

function buildPlate(rows) {
  const buttons = buildButtons(rows);
  const occupied = new Uint8Array(NAMEPLATE_COLS * rows);
  const tiles = [];
  const mark = (r, c) => {
    occupied[r * NAMEPLATE_COLS + c] = 1;
  };

  // Reserve every button footprint so the packer fills around them.
  for (const button of buttons) {
    for (let dr = 0; dr < button.h; dr += 1) {
      for (let dc = 0; dc < button.w; dc += 1) mark(button.r + dr, button.c + dc);
    }
  }

  // Pave the whole grid, always filling the top-left-most open cell.
  const rng = mulberry32(0x1234abcd);
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < NAMEPLATE_COLS; c += 1) {
      if (occupied[r * NAMEPLATE_COLS + c]) continue;
      const footprint = chooseFootprint(occupied, r, c, rng, rows);
      for (let dr = 0; dr < footprint.h; dr += 1) {
        for (let dc = 0; dc < footprint.w; dc += 1) mark(r + dr, c + dc);
      }
      tiles.push({ r, c, w: footprint.w, h: footprint.h });
    }
  }

  return { tiles, buttons };
}

const area = (tile) => `${tile.r + 1} / ${tile.c + 1} / span ${tile.h} / span ${tile.w}`;

export function Nameplate({ grid, onNavigate }) {
  // The plate spans the full height of the wall, so its row count tracks the
  // shared grid. Re-pack only when the row count actually changes.
  const rows = grid ? grid.rows : 0;
  const { tiles, buttons } = useMemo(() => buildPlate(rows), [rows]);

  // Snap the plate onto a COLS x rows block of the shared stud grid: same cell
  // size, top-left flush with the wall's top-left corner, spanning to the wall's
  // bottom. The grid is measured once by the hero and handed to both layers, so
  // the plate sits on the identical cells the canvas drew.
  const box = useMemo(() => {
    if (!grid) return null;
    const { size, offsetX, offsetY } = grid;
    return {
      left: offsetX,
      top: offsetY,
      width: NAMEPLATE_COLS * size,
      height: rows * size,
      stud: size
    };
  }, [grid, rows]);

  return (
    <div
      className="nameplate"
      style={
        box
          ? {
              left: `${box.left}px`,
              top: `${box.top}px`,
              width: `${box.width}px`,
              height: `${box.height}px`,
              gridTemplateRows: `repeat(${rows}, 1fr)`,
              // One stud, exposed so the text can pad in by exactly a stud.
              "--stud": `${box.stud}px`
            }
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

      {buttons.map((button) => (
        <a
          key={button.id}
          className={`tile-button${button.icon ? " tile-button-icon" : ""}`}
          style={{ gridArea: area(button), "--btn-bg": button.bg, "--btn-ink": button.ink }}
          href={button.href}
          aria-label={button.icon ? button.label : undefined}
          {...(button.internal
            ? {
                onClick: (event) => {
                  event.preventDefault();
                  onNavigate(button.href);
                }
              }
            : { target: "_blank", rel: "noreferrer" })}
        >
          {button.icon ? ICONS[button.icon] : button.label}
        </a>
      ))}

      <div className="nameplate-text">
        <h1>Eugene Lee</h1>
        <p>I study Software Engineering at the University of Waterloo. I have an interest towards algorithms.</p>
      </div>
    </div>
  );
}
