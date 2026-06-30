import { memo, useMemo, type CSSProperties } from "react";
import { legoColor, type LegoColor, rgba } from "../data/legoColors";
import type { BoardType } from "../data/projects";

const LEGO = {
  red: legoColor("red"),
  blue: legoColor("blue"),
  azure: legoColor("mediumAzure"),
  yellow: legoColor("yellow"),
  orange: legoColor("orange"),
  green: legoColor("green"),
  lime: legoColor("lime"),
  white: legoColor("white"),
  gray: legoColor("lightBluishGray"),
  lightGray: legoColor("lightBluishGray"),
  darkGray: legoColor("darkBluishGray")
};

function boardColors(type: BoardType, width: number, height: number) {
  const cells: LegoColor[] = new Array(width * height).fill(LEGO.lightGray);
  const set = (x: number, y: number, color: LegoColor) => {
    if (x >= 0 && x < width && y >= 0 && y < height) cells[y * width + x] = color;
  };

  if (type === "heat") {
    const ramp = [LEGO.blue, LEGO.azure, LEGO.green, LEGO.lime, LEGO.yellow, LEGO.orange, LEGO.red];
    return cells.map((_, index) => {
      const x = index % width;
      const y = Math.floor(index / width);
      const distance = Math.hypot((x - width * 0.62) / (width * 0.92), (y - height * 0.34) / (height * 0.92));
      const n = Math.max(0, Math.min(0.999, 1 - distance * 1.55 + 0.1 * Math.sin(x * 0.7 + y * 0.6)));
      return ramp[Math.floor(n * ramp.length)];
    });
  }

  if (type === "layers") {
    const ramp = [LEGO.blue, LEGO.azure, LEGO.green, LEGO.lime, LEGO.yellow, LEGO.orange];
    return cells.map((_, index) => {
      const x = index % width;
      const y = Math.floor(index / width);
      const band = Math.floor(y / 2);
      return (x + band) % 6 === 0 ? LEGO.white : ramp[band % ramp.length];
    });
  }

  if (type === "bars") {
    return cells.map((_, index) => {
      const x = index % width;
      const y = Math.floor(index / width);
      const value = 2 + Math.round((Math.sin(x * 1.25) * 0.5 + 0.5) * (height - 2));
      if (y < height - value) return LEGO.lightGray;
      return [LEGO.blue, LEGO.azure, LEGO.green, LEGO.lime][Math.min(3, Math.floor((height - y) / 3))];
    });
  }

  cells.fill(LEGO.gray);
  const line = (x0: number, y0: number, x1: number, y1: number, color: LegoColor) => {
    const count = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
    for (let i = 0; i <= count; i += 1) {
      set(Math.round(x0 + ((x1 - x0) * i) / count), Math.round(y0 + ((y1 - y0) * i) / count), color);
    }
  };
  // Node layout authored on a 16x11 grid; scale to the actual board size.
  const sx = width / 16;
  const sy = height / 11;
  const nodes = [[2, 2], [8, 1], [13, 3], [5, 6], [11, 7], [3, 9], [9, 10]].map(
    ([x, y]) => [Math.round(x * sx), Math.round(y * sy)]
  ) as Array<[number, number]>;
  [[0, 1], [1, 2], [0, 3], [3, 4], [1, 4], [4, 6], [3, 5], [5, 6], [2, 4]].forEach(([a, b]) => {
    line(nodes[a][0], nodes[a][1], nodes[b][0], nodes[b][1], LEGO.darkGray);
  });
  [[0, 3], [3, 4], [4, 6]].forEach(([a, b]) => {
    line(nodes[a][0], nodes[a][1], nodes[b][0], nodes[b][1], LEGO.red);
  });
  nodes.forEach(([x, y], index) => {
    const color = index === 0 ? LEGO.green : index === 6 ? LEGO.orange : LEGO.blue;
    set(x, y, color);
    set(x + 1, y, color);
    set(x, y + 1, color);
  });
  return cells;
}

type BrickGridProps = {
  type: BoardType;
  width?: number;
  height?: number;
};

function boardImageDataUri(type: BoardType, width: number, height: number) {
  const cell = 12;
  const studRadius = cell * 0.3;
  const cells = boardColors(type, width, height);
  const body = cells
    .map((color, index) => {
      const x = (index % width) * cell;
      const y = Math.floor(index / width) * cell;
      const cx = x + cell / 2;
      const cy = y + cell / 2;

      return [
        `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="${color.value}"/>`,
        `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="#fff" opacity="0.08"/>`,
        `<path d="M${x} ${y + cell}h${cell}v-${cell}" fill="none" stroke="#000" stroke-opacity="0.22" stroke-width="1"/>`,
        `<circle cx="${cx}" cy="${cy}" r="${studRadius}" fill="${color.value}" stroke="${color.edge}" stroke-opacity="0.6" stroke-width="0.8"/>`,
        `<circle cx="${cx - cell * 0.08}" cy="${cy - cell * 0.09}" r="${studRadius * 0.68}" fill="#fff" opacity="0.1"/>`
      ].join("");
    })
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width * cell} ${height * cell}" width="${width * cell}" height="${height * cell}">${body}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const BrickThumb = memo(function BrickThumb({ type, width = 12, height = 8 }: BrickGridProps) {
  const src = useMemo(() => boardImageDataUri(type, width, height), [type, width, height]);

  return <img className="brick-thumb-image" src={src} alt="" draggable={false} />;
});

export const BrickGrid = memo(function BrickGrid({ type, width = 20, height = 14 }: BrickGridProps) {
  const cells = useMemo(() => boardColors(type, width, height), [type, width, height]);
  const style = useMemo(() => ({ gridTemplateColumns: `repeat(${width}, 1fr)` }), [width]);

  return (
    <div className="brick-grid" style={style}>
      {cells.map((color, index) => (
        <span
          className="brick-cell"
          style={{
            "--lego-color": rgba(color),
            "--lego-solid": color.value,
            "--lego-edge": color.edge,
            "--lego-alpha": color.alpha
          } as CSSProperties}
          title={color.name}
          key={`${type}-${index}`}
        >
          <span className="stud-logo" aria-hidden="true">LEGO</span>
        </span>
      ))}
    </div>
  );
});
