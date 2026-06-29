import type { CSSProperties } from "react";
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

export function BrickGrid({ type, width = 20, height = 14 }: BrickGridProps) {
  return (
    <div className="brick-grid" style={{ gridTemplateColumns: `repeat(${width}, 1fr)` }}>
      {boardColors(type, width, height).map((color, index) => (
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
}
