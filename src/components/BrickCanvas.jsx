import { useEffect, useRef } from "react";
import { heroRamp, hexToRgb, rgba } from "../data/legoColors.js";

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

function drawStud(ctx, x, y, size, color) {
  const alpha = color.alpha ?? 1;
  const edge = color.edge;
  const rgb = hexToRgb(color.value);
  const base = rgba(color);
  const top = rgba(color, color.transparent ? Math.min(0.78, alpha + 0.16) : 1);

  const groove = Math.max(1, size * 0.045);
  ctx.fillStyle = base;
  ctx.fillRect(x, y, size, size);

  const cellShade = ctx.createLinearGradient(x, y, x + size, y + size);
  cellShade.addColorStop(0, "rgba(255,255,255,.18)");
  cellShade.addColorStop(0.48, "rgba(255,255,255,0)");
  cellShade.addColorStop(1, "rgba(0,0,0,.2)");
  ctx.fillStyle = cellShade;
  ctx.fillRect(x, y, size, size);

  ctx.fillStyle = "rgba(0,0,0,.2)";
  ctx.fillRect(x, y + size - groove, size, groove);
  ctx.fillRect(x + size - groove, y, groove, size);
  ctx.fillStyle = "rgba(255,255,255,.18)";
  ctx.fillRect(x, y, size, groove);
  ctx.fillRect(x, y, groove, size);

  ctx.lineWidth = Math.max(1, size * 0.025);
  ctx.strokeStyle = color.edge;
  ctx.globalAlpha = color.transparent ? 0.5 : 0.3;
  ctx.strokeRect(x + ctx.lineWidth / 2, y + ctx.lineWidth / 2, size - ctx.lineWidth, size - ctx.lineWidth);
  ctx.globalAlpha = 1;

  const cx = x + size / 2;
  const cy = y + size / 2 - size * 0.025;
  const radius = size * 0.29;
  const sideDrop = size * 0.075;

  ctx.globalAlpha = color.transparent ? 0.54 : 0.34;
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.rect(cx - radius, cy, radius * 2, sideDrop);
  ctx.fill();

  ctx.fillStyle = edge;
  ctx.beginPath();
  ctx.ellipse(cx, cy + sideDrop, radius, radius * 0.22, 0, 0, Math.PI);
  ctx.lineTo(cx - radius, cy);
  ctx.lineTo(cx + radius, cy);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  const sideBand = ctx.createLinearGradient(cx, cy, cx, cy + sideDrop);
  sideBand.addColorStop(0, "rgba(255,255,255,.06)");
  sideBand.addColorStop(1, color.transparent ? "rgba(0,0,0,.18)" : "rgba(0,0,0,.24)");
  ctx.fillStyle = sideBand;
  ctx.beginPath();
  ctx.rect(cx - radius, cy, radius * 2, sideDrop);
  ctx.fill();

  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  const topPlane = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
  topPlane.addColorStop(0, color.transparent ? "rgba(255,255,255,.28)" : "rgba(255,255,255,.14)");
  topPlane.addColorStop(0.58, "rgba(255,255,255,0)");
  topPlane.addColorStop(1, color.transparent ? "rgba(0,0,0,.06)" : "rgba(0,0,0,.1)");
  ctx.fillStyle = topPlane;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.96, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = Math.max(1, size * 0.035);
  ctx.strokeStyle = edge;
  ctx.globalAlpha = color.transparent ? 0.68 : 0.44;
  ctx.beginPath();
  ctx.arc(cx, cy, radius - ctx.lineWidth * 0.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  const sheen = ctx.createLinearGradient(x + size * 0.22, y + size * 0.2, x + size * 0.78, y + size * 0.34);
  sheen.addColorStop(0, color.transparent ? "rgba(255,255,255,.42)" : "rgba(255,255,255,.18)");
  sheen.addColorStop(0.24, "rgba(255,255,255,.08)");
  sheen.addColorStop(1, `rgba(${Math.max(0, rgb.r - 80)}, ${Math.max(0, rgb.g - 80)}, ${Math.max(0, rgb.b - 80)}, 0)`);
  ctx.fillStyle = sheen;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.88, Math.PI * 1.05, Math.PI * 1.72);
  ctx.lineTo(cx, cy);
  ctx.fill();

  if (color.transparent) {
    ctx.strokeStyle = "rgba(255,255,255,.38)";
    ctx.lineWidth = Math.max(1, size * 0.025);
    ctx.beginPath();
    ctx.arc(cx - radius * 0.12, cy - radius * 0.12, radius * 0.62, Math.PI * 1.05, Math.PI * 1.6);
    ctx.stroke();
  }

  if (size >= 15) {
    ctx.save();
    ctx.translate(cx, cy + radius * 0.05);
    ctx.scale(0.68, 1.72);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `900 ${Math.max(4, size * 0.16)}px Arial, sans-serif`;
    ctx.letterSpacing = "0px";
    ctx.fillStyle = "rgba(255,255,255,.2)";
    ctx.fillText("LEGO", 0, -size * 0.012);
    ctx.fillStyle = "rgba(0,0,0,.14)";
    ctx.fillText("LEGO", 0, size * 0.012);
    ctx.strokeStyle = "rgba(255,255,255,.12)";
    ctx.lineWidth = Math.max(0.25, size * 0.01);
    ctx.strokeText("LEGO", 0, 0);
    ctx.restore();
  }
}

export function BrickCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let frame = 0;
    let animationId;

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

      const columns = Math.max(24, Math.min(54, Math.round(width / 28)));
      const size = width / columns;
      const rows = Math.ceil(height / size);
      const t = frame * 0.025;

      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < columns; x += 1) {
          drawStud(ctx, x * size, y * size, size, flowColor(x, y, t, columns, rows));
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
