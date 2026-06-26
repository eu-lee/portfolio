import { useEffect, useRef } from "react";

const ramp = ["#0B5FA5", "#1E9DD5", "#3A8C3F", "#A6C520", "#F2CD37", "#FE8A18", "#C91A09"];

function flowColor(x, y, t, w, h) {
  const fx = x / Math.max(1, w - 1);
  const fy = y / Math.max(1, h - 1);
  const value =
    Math.sin(fx * 13 + t) +
    Math.sin(fy * 10 + t * 0.85) +
    Math.sin((fx + fy) * 7.5 + t * 1.25) +
    Math.sin(Math.hypot(fx - 0.55, fy - 0.4) * 12 - t * 1.1);
  const normalized = Math.max(0, Math.min(0.999, (value + 4) / 8));
  return ramp[Math.floor(normalized * ramp.length)];
}

function drawStud(ctx, x, y, size, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, size, size);

  const cx = x + size / 2;
  const cy = y + size / 2;
  const radius = size * 0.36;

  const ring = ctx.createRadialGradient(cx, cy, radius * 0.45, cx, cy, radius);
  ring.addColorStop(0, "rgba(0,0,0,0)");
  ring.addColorStop(0.62, "rgba(0,0,0,0)");
  ring.addColorStop(0.78, "rgba(0,0,0,.24)");
  ring.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = ring;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  const shine = ctx.createRadialGradient(
    x + size * 0.4,
    y + size * 0.37,
    1,
    x + size * 0.4,
    y + size * 0.37,
    radius * 0.85
  );
  shine.addColorStop(0, "rgba(255,255,255,.56)");
  shine.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = shine;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
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
