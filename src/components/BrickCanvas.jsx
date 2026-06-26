import { useEffect, useRef } from "react";
import { heroRamp, mixColor } from "../data/legoColors.js";

function flowColor(x, y, t, w, h) {
  const fx = x / Math.max(1, w - 1);
  const fy = y / Math.max(1, h - 1);
  const value =
    Math.sin(fx * 13 + t) +
    Math.sin(fy * 10 + t * 0.85) +
    Math.sin((fx + fy) * 7.5 + t * 1.25) +
    Math.sin(Math.hypot(fx - 0.55, fy - 0.4) * 12 - t * 1.1);
  const normalized = Math.max(0, Math.min(0.999, (value + 4) / 8));
  return heroRamp[Math.floor(normalized * heroRamp.length)];
}

// Deterministic, position-locked surface variation so the field reads as real
// plastic rather than flat CGI. Independent of time => no shimmer when animated.
function surfaceJitter(x, y) {
  const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return h - Math.floor(h) - 0.5; // [-0.5, 0.5]
}

// Single light direction: top-left. Highlights live upper-left, shadows fall
// toward the bottom-right. Every term below is derived from that one choice.
function drawStud(ctx, x, y, size, color) {
  const alpha = color.alpha ?? 1;
  const trans = !!color.transparent;
  const k = trans ? 0.6 : 1; // translucent plastic occludes/shades less

  // --- Base plate: darker than the raised stud top. ---
  ctx.fillStyle = mixColor(color, trans ? -0.06 : -0.12, alpha);
  ctx.fillRect(x, y, size, size);

  const plateShade = ctx.createLinearGradient(x, y, x + size, y + size);
  plateShade.addColorStop(0, `rgba(255,255,255,${0.11 * k})`);
  plateShade.addColorStop(0.5, "rgba(255,255,255,0)");
  plateShade.addColorStop(1, `rgba(0,0,0,${0.2 * k})`);
  ctx.fillStyle = plateShade;
  ctx.fillRect(x, y, size, size);

  // --- Inter-brick seam (ambient occlusion in the gap). Each side is drawn as
  //     a single combined path filled once, so the bottom/right strips don't
  //     double-darken where they overlap at the corner — which is what made
  //     the points where four studs meet clump up dark. ---
  const groove = Math.max(1, size * 0.05);
  const lit = groove * 0.7;
  ctx.fillStyle = `rgba(0,0,0,${0.32 * k})`; // shadow side: bottom + right
  ctx.beginPath();
  ctx.rect(x, y + size - groove, size, groove);
  ctx.rect(x + size - groove, y, groove, size);
  ctx.fill();
  ctx.fillStyle = `rgba(255,255,255,${0.14 * k})`; // lit side: thin top + left catch
  ctx.beginPath();
  ctx.rect(x, y, size, lit);
  ctx.rect(x, y, lit, size);
  ctx.fill();

  // --- Stud geometry ---
  const cx = x + size / 2;
  const cy = y + size / 2;
  const topR = size * 0.31; // true LEGO 5mm/8mm => 0.625 diameter
  const wallH = size * 0.07; // visible cylinder wall (slight top-down view)

  // --- Cast shadow on the plate: a tight contact shadow tucked under the
  //     stud's lower-right. Kept small so it fades before the corner/seam and
  //     doesn't pool into a dark spot where bricks meet. ---
  const shx = cx + size * 0.04;
  const shy = cy + wallH + size * 0.045;
  const shadow = ctx.createRadialGradient(shx, shy, topR * 0.15, shx, shy, topR * 1.05);
  shadow.addColorStop(0, `rgba(0,0,0,${0.44 * k})`);
  shadow.addColorStop(0.65, `rgba(0,0,0,${0.16 * k})`);
  shadow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(shx, shy, topR * 1.05, topR * 0.78, 0, 0, Math.PI * 2);
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
  ctx.fillStyle = mixColor(color, trans ? 0.05 : 0.1, alpha);
  ctx.beginPath();
  ctx.arc(cx, cy, topR, 0, Math.PI * 2);
  ctx.fill();

  // Matte diffuse: a single light from the top-left grades the flat top from
  // lit (upper-left) to shadowed (lower-right). No specular — fully matte.
  const topFace = ctx.createLinearGradient(cx - topR, cy - topR, cx + topR, cy + topR);
  topFace.addColorStop(0, `rgba(255,255,255,${trans ? 0.2 : 0.16})`);
  topFace.addColorStop(0.5, "rgba(255,255,255,0)");
  topFace.addColorStop(1, `rgba(0,0,0,${trans ? 0.14 : 0.24})`);
  ctx.fillStyle = topFace;
  ctx.beginPath();
  ctx.arc(cx, cy, topR, 0, Math.PI * 2);
  ctx.fill();

  // Molded top edge ring (defines the flat circular rim).
  ctx.lineWidth = Math.max(1, size * 0.028);
  ctx.strokeStyle = mixColor(color, -0.46, trans ? 0.5 : 0.62);
  ctx.beginPath();
  ctx.arc(cx, cy, topR - ctx.lineWidth * 0.5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, topR, 0, Math.PI * 2);
  ctx.clip();

  // --- Embossed LEGO wordmark (matte relief from the same top-left light). ---
  if (size >= 12) {
    ctx.translate(cx, cy);
    ctx.scale(0.66, 1.7);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `900 ${Math.max(3, size * 0.155)}px Arial, sans-serif`;
    ctx.fillStyle = `rgba(0,0,0,${trans ? 0.18 : 0.26})`; // shadow toward lower-right
    ctx.fillText("LEGO", size * 0.012, size * 0.014);
    ctx.fillStyle = `rgba(255,255,255,${trans ? 0.32 : 0.24})`; // catch toward upper-left
    ctx.fillText("LEGO", -size * 0.012, -size * 0.014);
    ctx.fillStyle = mixColor(color, trans ? 0.04 : 0.08, alpha); // face of the letters
    ctx.fillText("LEGO", 0, 0);
  }
  ctx.restore();
}

export function BrickCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let frame = 0;
    let animationId;
    // One detailed stud rendered per palette color, reused every frame.
    let spriteCache = new Map();
    let cacheKey = "";

    function getSprite(color, size, dpr) {
      const cached = spriteCache.get(color.name);
      if (cached) return cached;
      const off = document.createElement("canvas");
      const px = Math.max(1, Math.ceil(size * dpr));
      off.width = px;
      off.height = px;
      const octx = off.getContext("2d");
      octx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawStud(octx, 0, 0, size, color);
      spriteCache.set(color.name, off);
      return off;
    }

    function render() {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const width = Math.ceil(rect.width);
      const height = Math.ceil(rect.height);

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      const columns = Math.max(34, Math.min(76, Math.round(width / 20)));
      const size = width / columns;
      const rows = Math.ceil(height / size);
      const t = frame * 0.025;

      // Rebuild the sprite cache only when the stud size (or DPR) changes.
      const key = `${size.toFixed(3)}:${dpr}`;
      if (key !== cacheKey) {
        spriteCache = new Map();
        cacheKey = key;
      }

      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < columns; x += 1) {
          const color = flowColor(x, y, t, columns, rows);
          const px = x * size;
          const py = y * size;
          ctx.drawImage(getSprite(color, size, dpr), px, py, size, size);

          const j = surfaceJitter(x, y);
          ctx.globalAlpha = Math.abs(j) * 0.05;
          ctx.fillStyle = j > 0 ? "#fff" : "#000";
          ctx.fillRect(px, py, size, size);
          ctx.globalAlpha = 1;
        }
      }

      frame += 1;
      animationId = requestAnimationFrame(render);
    }

    render();
    return () => cancelAnimationFrame(animationId);
  }, []);

  return <canvas className="brick-canvas" ref={canvasRef} aria-hidden="true" />;
}
