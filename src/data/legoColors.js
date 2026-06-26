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
  brightLightBlue: { name: "Bright Light Blue", value: "#9DC3F7", edge: "#333333", alpha: 1 },
  transDarkBlue: { name: "Trans Dark Blue", value: "#0020A0", edge: "#000B38", alpha: 128 / 255, transparent: true },
  transGreen: { name: "Trans Green", value: "#237841", edge: "#174F2B", alpha: 128 / 255, transparent: true },
  transRed: { name: "Trans Red", value: "#C91A09", edge: "#660D05", alpha: 128 / 255, transparent: true },
  transYellow: { name: "Trans Yellow", value: "#F5CD2F", edge: "#B49208", alpha: 128 / 255, transparent: true },
  transClear: { name: "Trans Clear", value: "#FCFCFC", edge: "#C9C9C9", alpha: 128 / 255, transparent: true },
  transLightBlue: { name: "Trans Light Blue", value: "#AEE9EF", edge: "#59D1DE", alpha: 128 / 255, transparent: true },
  transOrange: { name: "Trans Orange", value: "#F08F1C", edge: "#9E5C0A", alpha: 128 / 255, transparent: true },
  transPurple: { name: "Trans Purple", value: "#A5A5CB", edge: "#6464A6", alpha: 128 / 255, transparent: true }
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

export const heroRamp = [
  legoColor("blue"),
  legoColor("mediumAzure"),
  legoColor("green"),
  legoColor("lime"),
  legoColor("yellow"),
  legoColor("orange"),
  legoColor("red"),
  legoColor("transLightBlue"),
  legoColor("transOrange")
];
