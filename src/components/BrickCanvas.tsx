import { useEffect, useRef, useState } from "react";
import { decompressFrames, parseGIF, type ParsedFrame, type ParsedGif } from "gifuct-js";
import { mixColor, type LegoColor } from "../data/legoColors";
import type { StudGrid } from "../lib/heroGrid";

type MediaKind = "video" | "gif" | "image";
type StudTint = Pick<LegoColor, "value" | "alpha">;
type ComposedGifFrame = {
  source: HTMLCanvasElement;
  delay: number;
};
type ComposedGif = {
  width: number;
  height: number;
  frames: ComposedGifFrame[];
};
type VideoFrameElement = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: (time: number) => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

type BrickCanvasProps = {
  src: string;
  grid: StudGrid | null;
  panStuds?: number;
  focalX?: number;
  focalY?: number;
  mediaDarken?: number;
  // Whether this canvas's route is on screen. When false the animated GIF redraw
  // loop is frozen (the canvas keeps its last frame) so we don't burn CPU
  // rendering a wall nobody can see.
  active?: boolean;
  // Playback rate for the animated GIF, relative to its native timing. 1 = normal;
  // >1 slows it down (each frame's delay is multiplied), so the dimmed background
  // on about/projects can drift more slowly than the home hero.
  slowdown?: number;
};

function canvasContext(canvas: HTMLCanvasElement, options?: CanvasRenderingContext2DSettings) {
  const ctx = canvas.getContext("2d", options);
  if (!ctx) {
    throw new Error("Could not create 2D canvas context");
  }
  return ctx;
}

// Deterministic, position-locked surface variation so the field reads as real
// plastic rather than flat CGI. Independent of the source image => fine grain.
function surfaceJitter(x: number, y: number) {
  const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return h - Math.floor(h) - 0.5; // [-0.5, 0.5]
}

// Each stud is tinted with the actual color sampled from the source image, so
// the wall reproduces the photo's full range rather than a fixed palette. The
// tint is quantized to 8 steps per channel only to bound the sprite cache: a
// downsampled image resolves to a few hundred distinct tints, indistinguishable
// from the exact sample but cheap to cache and redraw.
const quantizeChannel = (n: number) => n & 0xf8;
function quantizeHex(r: number, g: number, b: number): `#${string}` {
  const packed =
    (1 << 24) + (quantizeChannel(r) << 16) + (quantizeChannel(g) << 8) + quantizeChannel(b);
  return `#${packed.toString(16).slice(1)}`;
}

const GIF_SOURCE_RE = /\.gif(?:$|[?#])/i;
const VIDEO_SOURCE_RE = /\.(mp4|webm|ogg|ogv|mov)(?:$|[?#])/i;

function mediaKindFromSrc(src: string): MediaKind {
  if (VIDEO_SOURCE_RE.test(src)) return "video";
  if (GIF_SOURCE_RE.test(src)) return "gif";
  return "image";
}

function mediaSize(media: HTMLVideoElement | HTMLImageElement | ComposedGif, kind: MediaKind) {
  if (kind === "video") {
    const video = media as HTMLVideoElement;
    return { width: video.videoWidth, height: video.videoHeight };
  }
  if (kind === "gif") {
    const gif = media as ComposedGif;
    return { width: gif.width, height: gif.height };
  }
  const image = media as HTMLImageElement;
  return { width: image.naturalWidth, height: image.naturalHeight };
}

function composeGifFrames(parsedGif: ParsedGif, frames: ParsedFrame[]): ComposedGif {
  const width = parsedGif.lsd.width;
  const height = parsedGif.lsd.height;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvasContext(canvas);
  const composed: ComposedGifFrame[] = [];
  let previousFrame: ParsedFrame | null = null;
  let restoreData: { left: number; top: number; data: ImageData } | null = null;

  for (const frame of frames) {
    if (previousFrame?.disposalType === 2) {
      const { left, top, width: frameWidth, height: frameHeight } = previousFrame.dims;
      ctx.clearRect(left, top, frameWidth, frameHeight);
    } else if (previousFrame?.disposalType === 3 && restoreData) {
      ctx.putImageData(restoreData.data, restoreData.left, restoreData.top);
      restoreData = null;
    }

    const { left, top, width: frameWidth, height: frameHeight } = frame.dims;
    if (frame.disposalType === 3) {
      restoreData = {
        left,
        top,
        data: ctx.getImageData(left, top, frameWidth, frameHeight)
      };
    }

    const patchCanvas = document.createElement("canvas");
    patchCanvas.width = frameWidth;
    patchCanvas.height = frameHeight;
    canvasContext(patchCanvas).putImageData(new ImageData(new Uint8ClampedArray(frame.patch), frameWidth, frameHeight), 0, 0);
    ctx.drawImage(patchCanvas, left, top);

    const fullFrame = document.createElement("canvas");
    fullFrame.width = width;
    fullFrame.height = height;
    canvasContext(fullFrame).drawImage(canvas, 0, 0);
    composed.push({
      source: fullFrame,
      delay: Math.max(20, frame.delay || 100)
    });

    previousFrame = frame;
  }

  return { width, height, frames: composed };
}

// Single light direction: top-left. Highlights live upper-left, shadows fall
// toward the bottom-right. `color` is any { value: "#rrggbb", alpha } — the tint
// is supplied per stud by sampling the source image, not a fixed LEGO palette.
function drawStud(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: StudTint) {
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
// color. Static images render once; GIFs run a throttled redraw loop so the
// sampled frame keeps advancing. The grid ({ columns, rows, size, width, height,
// dpr }) is measured once by the hero, sized to cover the viewport so the wall
// bleeds off every edge.
export function BrickCanvas({
  src,
  grid,
  panStuds = 0,
  focalX = 0.5,
  focalY = 0.5,
  mediaDarken = 0,
  active = true,
  slowdown = 1
}: BrickCanvasProps) {
  const kind = mediaKindFromSrc(src);
  // Live playback rate, read by the running GIF loop each frame. Kept in a ref (not
  // an effect dep) so a slowdown change re-times the NEXT frame in place instead of
  // tearing down the loop and restarting the GIF from frame 0.
  const slowdownRef = useRef(slowdown);
  slowdownRef.current = slowdown;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const gifRef = useRef<ComposedGif | null>(null);
  // One detailed stud rendered per (quantized) tint, reused across the wall and
  // across redraws; only rebuilt when the stud size or DPR changes.
  const spriteRef = useRef<{ cache: Map<string, HTMLCanvasElement>; key: string }>({ cache: new Map(), key: "" });
  const [ready, setReady] = useState(false);

  // Reset readiness when the source changes; the hidden DOM media element below
  // will flip this back on from its load event.
  useEffect(() => {
    setReady(false);
    gifRef.current = null;
  }, [src, kind]);

  useEffect(() => {
    if (kind !== "gif") return undefined;
    let cancelled = false;

    fetch(src)
      .then((response) => response.arrayBuffer())
      .then((buffer) => {
        if (cancelled) return;
        const parsedGif = parseGIF(buffer);
        const frames = decompressFrames(parsedGif, true);
        gifRef.current = composeGifFrames(parsedGif, frames);
        setReady(true);
      })
      .catch((error) => {
        console.error("Failed to decode GIF background", error);
      });

    return () => {
      cancelled = true;
    };
  }, [kind, src]);

  useEffect(() => {
    if (kind !== "video" || !ready) return undefined;
    const video = videoElementRef.current;
    if (!video) return undefined;
    video.play().catch(() => {});
    return () => video.pause();
  }, [kind, ready, src]);

  // Redraw whenever the shared grid or the loaded image changes. Animated GIFs
  // need repeated draws because a canvas only stores the frame last painted into
  // it; the GIF can keep advancing but the canvas will not update by itself.
  useEffect(() => {
    const gif = gifRef.current;
    const media = kind === "video"
      ? videoElementRef.current
      : kind === "gif"
        ? gif
        : imageElementRef.current;
    const sourceSize = media ? mediaSize(media, kind) : { width: 0, height: 0 };
    if (!grid || !ready || !media || sourceSize.width === 0 || sourceSize.height === 0) return;

    const { columns, rows, cell, deviceWidth, deviceHeight } = grid;
    if (deviceWidth === 0 || deviceHeight === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvasContext(canvas);
    if (canvas.width !== deviceWidth || canvas.height !== deviceHeight) {
      canvas.width = deviceWidth;
      canvas.height = deviceHeight;
    }
    // Draw straight in device pixels: `cell` is a whole number of them and every
    // stud sits at x*cell / y*cell, so the wall tiles seamlessly (no azure bleed)
    // and blits 1:1 with no resampling. Smoothing off as belt-and-suspenders.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;

    function getSprite(hex: `#${string}`) {
      const cached = spriteRef.current.cache.get(hex);
      if (cached) return cached;
      const off = document.createElement("canvas");
      off.width = cell;
      off.height = cell;
      const octx = canvasContext(off);
      drawStud(octx, 0, 0, cell, { value: hex, alpha: 1 });
      spriteRef.current.cache.set(hex, off);
      return off;
    }

    // Offscreen buffer that downsamples the source image to the stud grid; the
    // browser averages each source region for us as it scales the draw down.
    const sampler = document.createElement("canvas");
    const sctx = canvasContext(sampler, { willReadFrequently: true });

    // Downsample the source into a columns x rows buffer, cover-fitting it so it
    // matches CSS `background-size: cover` framing. `focalX` / `focalY` choose
    // which part of oversized media stays in frame; `panStuds` adds a small
    // horizontal manual nudge when needed.
    sampler.width = columns;
    sampler.height = rows;
    const scale = Math.max(columns / sourceSize.width, rows / sourceSize.height);
    const dw = sourceSize.width * scale;
    const dh = sourceSize.height * scale;
    const clampedFocalX = Math.max(0, Math.min(1, focalX));
    const clampedFocalY = Math.max(0, Math.min(1, focalY));

    // Rebuild the sprite cache only when the stud pixel size changes.
    const key = `${cell}`;
    if (key !== spriteRef.current.key) {
      spriteRef.current = { cache: new Map(), key };
    }

    // The image is bounded to the inner frame and fades to black at its top and
    // bottom edges, with a black border around it. The fade is a per-stud (pixel)
    // black wash — each stud row darkens a step — *masked* by a smooth gradient,
    // so it keeps the pixel character but the gradient grades within each stud and
    // dissolves the blocky row-steps continuously into the border (built below,
    // after the studs are drawn).
    const TOP_EDGE_FADE = 28; // studs the top fade spans
    const BOTTOM_EDGE_FADE = 22; // bottom starts earlier and fades across more studs
    const TOP_EDGE_MAX_ALPHA = 1;
    const BOTTOM_EDGE_MAX_ALPHA = 1;
    const TOP_EDGE_CURVE = 0.8; // lower spreads the darkening deeper so the image dissolves smoothly into the frame instead of clashing right at the edge
    const BOTTOM_EDGE_CURVE = 1.2; // concentrate darkening near the very bottom so studs keep their texture over already-dark content (no dead flat-black slab)
    const BOTTOM_SOLID_ROWS = 1;
    const BOTTOM_NEAR_SOLID_ROWS = 1;
    const BOTTOM_NEAR_SOLID_ALPHA = 0.85;
    const vSpan = Math.min(Math.max(TOP_EDGE_FADE, BOTTOM_EDGE_FADE) * cell, deviceHeight / 2);
    const smooth = (t: number) => t * t * (3 - 2 * t);
    const expFade = (t: number, maxAlpha: number, curve: number) => {
      const clamped = Math.max(0, Math.min(1, t));
      return ((Math.exp(curve * clamped) - 1) / (Math.exp(curve) - 1)) * maxAlpha;
    };
    const pixelFade = (y: number) => {
      const topDist = y + 0.5;
      const bottomRow = rows - 1 - y;
      const topAlpha = expFade(1 - (topDist - 0.5) / TOP_EDGE_FADE, TOP_EDGE_MAX_ALPHA, TOP_EDGE_CURVE);
      const bottomFixedRows = BOTTOM_SOLID_ROWS + BOTTOM_NEAR_SOLID_ROWS;
      if (bottomRow < bottomFixedRows) return topAlpha;
      const bottomDist = bottomRow - bottomFixedRows + 0.5;
      const bottomAlpha = expFade(
        1 - (bottomDist - 0.5) / BOTTOM_EDGE_FADE,
        BOTTOM_EDGE_MAX_ALPHA,
        BOTTOM_EDGE_CURVE
      );
      return Math.max(topAlpha, bottomAlpha);
    };

    const layer = document.createElement("canvas");
    layer.width = deviceWidth;
    layer.height = deviceHeight;
    const lctx = canvasContext(layer);
    const mask = vSpan > 0 ? lctx.createLinearGradient(0, 0, 0, deviceHeight) : null;
    if (mask) {
      // The mask only smooths the per-row black wash where it meets the clear
      // interior — it must NOT attenuate the dark edge rows (multiplying two
      // fades there squares them and leaves the image bright right at the frame).
      // smoothstep gives a flat shoulder at ~1 next to the edge, so the edge rows
      // keep their full pixelFade darkness, then it feathers to 0 across the span
      // and dissolves the blocky row-steps continuously into the image.
      const topFr = Math.min(0.5, (TOP_EDGE_FADE * cell) / deviceHeight);
      const botFr = Math.min(0.5, (BOTTOM_EDGE_FADE * cell) / deviceHeight);
      for (let i = 0; i <= 8; i += 1) {
        const u = i / 8;
        const a = 1 - smooth(u); // 1 at the edge, 0 at the inner end of the span
        mask.addColorStop(u * topFr, `rgba(0,0,0,${a})`);
        mask.addColorStop(1 - u * botFr, `rgba(0,0,0,${a})`);
      }
    }

    const drawFrame = (source: CanvasImageSource) => {
      sctx.clearRect(0, 0, columns, rows);
      sctx.drawImage(
        source,
        (columns - dw) * clampedFocalX + panStuds,
        (rows - dh) * clampedFocalY,
        dw,
        dh
      );
      const pixels = sctx.getImageData(0, 0, columns, rows).data;
      const darken = Math.max(0, Math.min(0.9, mediaDarken));
      const darkenFactor = 1 - darken;

      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < columns; x += 1) {
          const i = (y * columns + x) * 4;
          const hex = quantizeHex(
            pixels[i] * darkenFactor,
            pixels[i + 1] * darkenFactor,
            pixels[i + 2] * darkenFactor
          );
          const px = x * cell;
          const py = y * cell;
          ctx.drawImage(getSprite(hex), px, py, cell, cell);

          const j = surfaceJitter(x, y);
          ctx.globalAlpha = Math.abs(j) * 0.05;
          ctx.fillStyle = j > 0 ? "#fff" : "#000";
          ctx.fillRect(px, py, cell, cell);
          ctx.globalAlpha = 1;
        }
      }

      // Top/bottom edge fade, built on its own layer so the gradient mask
      // (destination-in) doesn't erase the wall: (1) paint the pixel fade as a
      // flat black alpha per stud row, then (2) multiply it by a smooth gradient
      // mask before compositing back over the studs.
      if (mask) {
        lctx.globalCompositeOperation = "source-over";
        lctx.clearRect(0, 0, deviceWidth, deviceHeight);
        lctx.fillStyle = "#000";
        for (let y = 0; y < rows; y += 1) {
          const a = pixelFade(y);
          if (a <= 0) continue;
          lctx.globalAlpha = a;
          lctx.fillRect(0, y * cell, deviceWidth, cell);
        }
        lctx.globalAlpha = 1;
        lctx.globalCompositeOperation = "destination-in";
        lctx.fillStyle = mask;
        lctx.fillRect(0, 0, deviceWidth, deviceHeight);
        ctx.drawImage(layer, 0, 0);
      }

      ctx.fillStyle = "#000";
      ctx.globalAlpha = BOTTOM_NEAR_SOLID_ALPHA;
      ctx.fillRect(0, deviceHeight - (BOTTOM_SOLID_ROWS + BOTTOM_NEAR_SOLID_ROWS) * cell, deviceWidth, BOTTOM_NEAR_SOLID_ROWS * cell);
      ctx.globalAlpha = 1;
      ctx.fillRect(0, deviceHeight - BOTTOM_SOLID_ROWS * cell, deviceWidth, BOTTOM_SOLID_ROWS * cell);
    };

    const frameMs = 1000 / 12;
    let animationFrame = 0;
    let videoFrame = 0;
    let gifTimer = 0;
    let lastDraw = 0;
    let stopped = false;
    let cancelVideoFrame: ((handle: number) => void) | undefined;

    const tick = (time: number) => {
      if (stopped) return;
      if (time - lastDraw >= frameMs) {
        drawFrame(media as CanvasImageSource);
        lastDraw = time;
      }
      animationFrame = requestAnimationFrame(tick);
    };

    if (kind === "gif") {
      const gifMedia = media as ComposedGif;
      let frameIndex = 0;
      const gifFrames = gifMedia.frames;
      // Only animate while this route is on screen; off screen we still paint a
      // single static frame (so the dimmed mosaic is present on every route, even
      // on a direct load) but skip the loop instead of rendering a hidden one.
      if (gifFrames.length > 0) {
        if (active) {
          const drawNextGifFrame = () => {
            if (stopped || gifFrames.length === 0) return;
            const frame = gifFrames[frameIndex];
            drawFrame(frame.source);
            frameIndex = (frameIndex + 1) % gifFrames.length;
            gifTimer = window.setTimeout(drawNextGifFrame, frame.delay * Math.max(1, slowdownRef.current));
          };
          drawNextGifFrame();
        } else {
          drawFrame(gifFrames[0].source);
        }
      }
    } else if (kind === "video") {
      const videoMedia = media as VideoFrameElement;
      drawFrame(videoMedia);
      const scheduleVideoFrame = () => {
        if (stopped) return;
        if (typeof videoMedia.requestVideoFrameCallback === "function") {
          cancelVideoFrame = videoMedia.cancelVideoFrameCallback?.bind(videoMedia);
          videoFrame = videoMedia.requestVideoFrameCallback((time: number) => {
            if (stopped) return;
            if (time - lastDraw >= frameMs) {
              drawFrame(videoMedia);
              lastDraw = time;
            }
            scheduleVideoFrame();
          });
        } else {
          animationFrame = requestAnimationFrame(tick);
        }
      };
      scheduleVideoFrame();
    } else {
      drawFrame(media as HTMLImageElement);
    }

    return () => {
      stopped = true;
      if (animationFrame) cancelAnimationFrame(animationFrame);
      if (gifTimer) window.clearTimeout(gifTimer);
      if (videoFrame && cancelVideoFrame) {
        cancelVideoFrame(videoFrame);
      }
    };
  }, [grid, kind, ready, src, panStuds, focalX, focalY, mediaDarken, active]);

  // Position the fitted wall in CSS px and centre it; the leftover ring is the
  // border frame. (The canvas backing store is sized in device px above.)
  const style = grid
    ? {
        left: `${grid.offsetX}px`,
        top: `${grid.offsetY}px`,
        width: `${grid.width}px`,
        height: `${grid.height}px`
      }
    : { display: "none" };

  return (
    <>
      {kind === "video" ? (
        <video
          ref={videoElementRef}
          className="brick-media-source"
          src={src}
          muted
          loop
          playsInline
          preload="auto"
          crossOrigin="anonymous"
          onLoadedData={() => setReady(true)}
          aria-hidden="true"
        />
      ) : kind === "image" ? (
        <img
          ref={imageElementRef}
          className="brick-media-source"
          src={src}
          alt=""
          onLoad={() => setReady(true)}
          aria-hidden="true"
        />
      ) : null}
      <canvas className="brick-canvas" ref={canvasRef} style={style} aria-hidden="true" />
    </>
  );
}
