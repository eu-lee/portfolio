export const LEGO_COLORS = {
  black: { name: "Black", value: "#1B2A34", edge: "#808080", alpha: 1 },
  blue: { name: "Blue", value: "#1E5AA8", edge: "#333333", alpha: 1 },
  green: { name: "Green", value: "#00852B", edge: "#333333", alpha: 1 },
  red: { name: "Red", value: "#B40000", edge: "#333333", alpha: 1 },
  yellow: { name: "Yellow", value: "#FAC80A", edge: "#333333", alpha: 1 },
  white: { name: "White", value: "#F4F4F4", edge: "#333333", alpha: 1 },
  orange: { name: "Orange", value: "#D67923", edge: "#333333", alpha: 1 },
  lime: { name: "Lime", value: "#A5CA18", edge: "#333333", alpha: 1 },
  lightBluishGray: { name: "Light Bluish Grey", value: "#969696", edge: "#333333", alpha: 1 },
  darkBluishGray: { name: "Dark Bluish Grey", value: "#646464", edge: "#333333", alpha: 1 },
  darkBlue: { name: "Dark Blue", value: "#19325A", edge: "#333333", alpha: 1 },
  darkGreen: { name: "Dark Green", value: "#00451A", edge: "#808080", alpha: 1 },
  darkRed: { name: "Dark Red", value: "#720012", edge: "#333333", alpha: 1 },
  mediumAzure: { name: "Medium Azure", value: "#68C3E2", edge: "#333333", alpha: 1 },
  brightLightOrange: { name: "Bright Light Orange", value: "#FCAC00", edge: "#333333", alpha: 1 },
  brightLightBlue: { name: "Bright Light Blue", value: "#9DC3F7", edge: "#333333", alpha: 1 }
};

export function legoColor(key) {
  return LEGO_COLORS[key] ?? LEGO_COLORS.lightBluishGray;
}

export function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const value = Number.parseInt(clean, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
}

export function rgba(color, alpha = color.alpha ?? 1) {
  const { r, g, b } = hexToRgb(color.value);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const clampChannel = (n) => Math.max(0, Math.min(255, Math.round(n)));

// Light-consistent shading from a base color. `amount` in [-1, 1]:
// positive lightens (tint), negative darkens (shade). Returns an rgba string.
export function mixColor(color, amount, alpha = color.alpha ?? 1) {
  const { r, g, b } = hexToRgb(color.value);
  const target = amount >= 0 ? 255 : 0;
  const k = Math.abs(amount);
  return `rgba(${clampChannel(r + (target - r) * k)}, ${clampChannel(
    g + (target - g) * k
  )}, ${clampChannel(b + (target - b) * k)}, ${alpha})`;
}

export const tint = (color, amount, alpha) => mixColor(color, Math.abs(amount), alpha);
export const shade = (color, amount, alpha) => mixColor(color, -Math.abs(amount), alpha);

export const heroRamp = [
  legoColor("blue"),
  legoColor("mediumAzure"),
  legoColor("green"),
  legoColor("lime"),
  legoColor("yellow"),
  legoColor("orange"),
  legoColor("red")
];
