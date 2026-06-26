const LEGO = {
  red: "#C91A09",
  blue: "#0B5FA5",
  azure: "#1E9DD5",
  yellow: "#F2CD37",
  orange: "#FE8A18",
  green: "#3A8C3F",
  lime: "#A6C520",
  white: "#F4F5F2",
  gray: "#9DA3A0",
  lightGray: "#C7CCC7",
  darkGray: "#5B5E5A"
};

function boardColors(type, width, height) {
  const cells = new Array(width * height).fill(LEGO.lightGray);
  const set = (x, y, color) => {
    if (x >= 0 && x < width && y >= 0 && y < height) cells[y * width + x] = color;
  };

  if (type === "heat") {
    const ramp = [LEGO.blue, LEGO.azure, LEGO.yellow, LEGO.orange, LEGO.red];
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
  const line = (x0, y0, x1, y1, color) => {
    const count = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
    for (let i = 0; i <= count; i += 1) {
      set(Math.round(x0 + ((x1 - x0) * i) / count), Math.round(y0 + ((y1 - y0) * i) / count), color);
    }
  };
  const nodes = [[2, 2], [8, 1], [13, 3], [5, 6], [11, 7], [3, 9], [9, 10]];
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

export function BrickGrid({ type, width = 16, height = 11 }) {
  return (
    <div className="brick-grid" style={{ gridTemplateColumns: `repeat(${width}, 1fr)` }}>
      {boardColors(type, width, height).map((color, index) => (
        <span className="brick-cell" style={{ backgroundColor: color }} key={`${type}-${index}`} />
      ))}
    </div>
  );
}
