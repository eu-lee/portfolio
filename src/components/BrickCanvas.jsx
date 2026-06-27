import { useEffect, useRef, useState } from "react";
import { mixColor } from "../data/legoColors.js";

// Deterministic, position-locked surface variation so the field reads as real
// plastic rather than flat CGI. Independent of the source image => fine grain.
function surfaceJitter(x, y) {
  const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return h - Math.floor(h) - 0.5; // [-0.5, 0.5]
}

// Each stud is tinted with the actual color sampled from the source image, so
// the wall reproduces the photo's full range rather than a fixed palette. The
// tint is quantized to 8 steps per channel only to bound the sprite cache: a
// downsampled image resolves to a few hundred distinct tints, indistinguishable
// from the exact sample but cheap to cache and redraw.
const quantizeChannel = (n) => n & 0xf8;
function quantizeHex(r, g, b) {
  const packed =
    (1 << 24) + (quantizeChannel(r) << 16) + (quantizeChannel(g) << 8) + quantizeChannel(b);
  return `#${packed.toString(16).slice(1)}`;
}

// Single light direction: top-left. Highlights live upper-left, shadows fall
// toward the bottom-right. `color` is any { value: "#rrggbb", alpha } — the tint
// is supplied per stud by sampling the source image, not a fixed LEGO palette.
function drawStud(ctx, x, y, size, color) {
  const alpha = color.alpha ?? 1;

  // --- Base plate: darker than the raised stud top. ---
  ctx.fillStyle = mixColor(color, -0.12, alpha);
  ctx.fillRect(x, y, size, size);

  const plateShade = ctx.createLinearGradient(x, y, x + size, y + size);
  plateShade.addColorStop(0, "rgba(255,255,255,0.11)");
  plateShade.addColorStop(0.5, "rgba(255,255,255,0)");
  plateShade.addColorStop(1, "rgba(0,0,0,0.2)");
  ctx.fillStyle = plateShade;
  ctx.fillRect(x, y, size, size);

  // --- Inter-brick seam (ambient occlusion in the gap). Each side is drawn as
  //     a single combined path filled once, so the bottom/right strips don't
  //     double-darken where they overlap at the corner — which is what made
  //     the points where four studs meet clump up dark. ---
  const groove = Math.max(1, size * 0.05);
  const lit = groove * 0.7;
  ctx.fillStyle = "rgba(0,0,0,0.32)"; // shadow side: bottom + right
  ctx.beginPath();
  ctx.rect(x, y + size - groove, size, groove);
  ctx.rect(x + size - groove, y, groove, size);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.14)"; // lit side: thin top + left catch
  ctx.beginPath();
  ctx.rect(x, y, size, lit);
  ctx.rect(x, y, lit, size);
  ctx.fill();

  // --- Stud geometry ---
  const topR = size * 0.31; // true LEGO 5mm/8mm => 0.625 diameter
  const wallH = size * 0.07; // visible cylinder wall (slight top-down view)
  const cx = x + size / 2;
  // Lift the stud slightly above the cell center. The cast shadow and wall
  // crescent both add dark weight below the disc, so a dead-center top face
  // reads as low; this nudge balances the composition optically.
  const cy = y + size / 2 - size * 0.05;

  // --- Cast shadow on the plate: a tight contact shadow tucked under the
  //     stud's lower-right. Kept small so it fades before the corner/seam and
  //     doesn't pool into a dark spot where bricks meet. ---
  const shx = cx + size * 0.05; // nudged toward the bottom-right, with the light
  const shy = cy + wallH + size * 0.065;
  const shadow = ctx.createRadialGradient(shx, shy, topR * 0.15, shx, shy, topR * 1.12);
  shadow.addColorStop(0, "rgba(0,0,0,0.52)");
  shadow.addColorStop(0.65, "rgba(0,0,0,0.2)");
  shadow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(shx, shy, topR * 1.12, topR * 0.82, 0, 0, Math.PI * 2);
  ctx.fill();

  // --- Cylinder wall: a body circle dropped below the top face shows as a
  //     directional crescent at the bottom (dark on the shadow side). ---
  const wall = ctx.createLinearGradient(cx - topR, cy, cx + topR, cy + wallH);
  wall.addColorStop(0, mixColor(color, -0.18, alpha));
  wall.addColorStop(0.5, mixColor(color, -0.38, alpha));
  wall.addColorStop(1, mixColor(color, -0.58, alpha));
  ctx.fillStyle = wall;
  ctx.beginPath();
  ctx.arc(cx, cy + wallH, topR, 0, Math.PI * 2);
  ctx.fill();

  // --- Top face: flat, and lighter than the recessed base plate so the
  //     raised circle reads as a distinct molded disc. ---
  ctx.fillStyle = mixColor(color, 0.1, alpha);
  ctx.beginPath();
  ctx.arc(cx, cy, topR, 0, Math.PI * 2);
  ctx.fill();

  // Matte diffuse: a single light from the top-left grades the flat top from
  // lit (upper-left) to shadowed (lower-right). No specular — fully matte.
  const topFace = ctx.createLinearGradient(cx - topR, cy - topR, cx + topR, cy + topR);
  topFace.addColorStop(0, "rgba(255,255,255,0.16)");
  topFace.addColorStop(0.5, "rgba(255,255,255,0)");
  topFace.addColorStop(1, "rgba(0,0,0,0.3)");
  ctx.fillStyle = topFace;
  ctx.beginPath();
  ctx.arc(cx, cy, topR, 0, Math.PI * 2);
  ctx.fill();

  // Molded top edge ring (defines the flat circular rim).
  ctx.lineWidth = Math.max(1, size * 0.028);
  ctx.strokeStyle = mixColor(color, -0.46, 0.62);
  ctx.beginPath();
  ctx.arc(cx, cy, topR - ctx.lineWidth * 0.5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, topR, 0, Math.PI * 2);
  ctx.clip();

  // --- Embossed LEGO wordmark (matte relief from the same top-left light). ---
  if (size >= 9) {
    ctx.translate(cx, cy);
    ctx.scale(0.66, 1.7);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `900 ${Math.max(3, size * 0.155)}px Arial, sans-serif`;
    ctx.fillStyle = "rgba(0,0,0,0.26)"; // shadow toward lower-right
    ctx.fillText("LEGO", size * 0.012, size * 0.014);
    ctx.fillStyle = "rgba(255,255,255,0.24)"; // catch toward upper-left
    ctx.fillText("LEGO", -size * 0.012, -size * 0.014);
    ctx.fillStyle = mixColor(color, 0.08, alpha); // face of the letters
    ctx.fillText("LEGO", 0, 0);
  }
  ctx.restore();
}

// Renders `src` as a wall of LEGO studs: the image is downsampled so each stud
// covers one source region, and the stud is tinted with that region's average
// color. Static (re-renders on grid / source change), since the input is a
// fixed image rather than an animation. The grid ({ columns, rows, size, width,
// height, dpr }) is measured once by the hero and shared with the nameplate so
// the two layers stay locked together at every zoom level.
export function BrickCanvas({ src, grid }) {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  // One detailed stud rendered per (quantized) tint, reused across the wall and
  // across redraws; only rebuilt when the stud size or DPR changes.
  const spriteRef = useRef({ cache: new Map(), key: "" });
  const [loaded, setLoaded] = useState(false);

  // Load the source once per src; redraws reuse the decoded image.
  useEffect(() => {
    const image = new Image();
    let cancelled = false;
    setLoaded(false);
    const onReady = () => {
      if (cancelled) return;
      imageRef.current = image;
      setLoaded(true);
    };
    image.onload = onReady;
    image.src = src;
    if (image.complete && image.naturalWidth > 0) onReady();
    return () => {
      cancelled = true;
      image.onload = null;
    };
  }, [src]);

  // Redraw whenever the shared grid or the loaded image changes.
  useEffect(() => {
    const image = imageRef.current;
    if (!grid || !loaded || !image || image.naturalWidth === 0) return;

    const { columns, rows, size, dpr } = grid;
    const width = Math.ceil(grid.width);
    const height = Math.ceil(grid.height);
    if (width === 0 || height === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    function getSprite(hex) {
      const cached = spriteRef.current.cache.get(hex);
      if (cached) return cached;
      const off = document.createElement("canvas");
      const px = Math.max(1, Math.ceil(size * dpr));
      off.width = px;
      off.height = px;
      const octx = off.getContext("2d");
      octx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawStud(octx, 0, 0, size, { value: hex, alpha: 1 });
      spriteRef.current.cache.set(hex, off);
      return off;
    }

    // Offscreen buffer that downsamples the source image to the stud grid; the
    // browser averages each source region for us as it scales the draw down.
    const sampler = document.createElement("canvas");
    const sctx = sampler.getContext("2d", { willReadFrequently: true });

    // Downsample the source into a columns x rows buffer, cover-fitting it
    // (center crop) so it matches a CSS `background-size: cover` framing.
    sampler.width = columns;
    sampler.height = rows;
    const scale = Math.max(columns / image.naturalWidth, rows / image.naturalHeight);
    const dw = image.naturalWidth * scale;
    const dh = image.naturalHeight * scale;
    sctx.clearRect(0, 0, columns, rows);
    sctx.drawImage(image, (columns - dw) / 2, (rows - dh) / 2, dw, dh);
    const pixels = sctx.getImageData(0, 0, columns, rows).data;

    // Rebuild the sprite cache only when the stud size (or DPR) changes.
    const key = `${size.toFixed(3)}:${dpr}`;
    if (key !== spriteRef.current.key) {
      spriteRef.current = { cache: new Map(), key };
    }

    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < columns; x += 1) {
        const i = (y * columns + x) * 4;
        const hex = quantizeHex(pixels[i], pixels[i + 1], pixels[i + 2]);
        const px = x * size;
        const py = y * size;
        ctx.drawImage(getSprite(hex), px, py, size, size);

        const j = surfaceJitter(x, y);
        ctx.globalAlpha = Math.abs(j) * 0.05;
        ctx.fillStyle = j > 0 ? "#fff" : "#000";
        ctx.fillRect(px, py, size, size);
        ctx.globalAlpha = 1;
      }
    }
  }, [grid, loaded]);

  return <canvas className="brick-canvas" ref={canvasRef} aria-hidden="true" />;
}
