/**
 * Proste animowane GIF-y gąsiora (oryginalny styl) + miękkie krawędzie, tło przezroczyste.
 * Uruchom: npm run generate:gasior-gifs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import gifenc from "gifenc";
const { GIFEncoder, quantize, applyPalette } = gifenc;

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "../public/gasior");

const W = 200;
const H = 240;

function blankFrame() {
  return new Uint8Array(W * H * 4);
}

function setPixel(rgba, x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= W || y >= H || a <= 0) return;
  const i = (y * W + x) * 4;
  const alpha = a / 255;
  const inv = 1 - alpha;
  rgba[i] = Math.round(r * alpha + rgba[i] * inv);
  rgba[i + 1] = Math.round(g * alpha + rgba[i + 1] * inv);
  rgba[i + 2] = Math.round(b * alpha + rgba[i + 2] * inv);
  rgba[i + 3] = Math.round(255 * (alpha + (rgba[i + 3] / 255) * inv));
}

/** Lekkie wygładzenie brzegu elipsy (antyaliasing ~1 px). */
function fillEllipseSmooth(rgba, cx, cy, rx, ry, r, g, b, a = 255) {
  const y0 = Math.max(0, Math.floor(cy - ry - 1));
  const y1 = Math.min(H - 1, Math.ceil(cy + ry + 1));
  const x0 = Math.max(0, Math.floor(cx - rx - 1));
  const x1 = Math.min(W - 1, Math.ceil(cx + rx + 1));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      const dist = Math.sqrt(nx * nx + ny * ny);
      if (dist > 1.05) continue;
      const edge = Math.max(0, Math.min(1, (1.02 - dist) / 0.12));
      setPixel(rgba, x, y, r, g, b, Math.round(a * edge));
    }
  }
}

function fillCircleSmooth(rgba, cx, cy, rad, r, g, b, a = 255) {
  fillEllipseSmooth(rgba, cx, cy, rad, rad, r, g, b, a);
}

function fillRect(rgba, x, y, w, h, r, g, b, a = 255) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) setPixel(rgba, xx, yy, r, g, b, a);
  }
}

function drawCarboyBase(rgba, wineRgb, frame, stage) {
  fillEllipseSmooth(rgba, 100, 228, 48, 6, 107, 31, 42, 28);
  fillEllipseSmooth(rgba, 100, 158, 58, 78, 232, 244, 252, 255);
  fillEllipseSmooth(rgba, 100, 158, 52, 72, wineRgb[0], wineRgb[1], wineRgb[2], 255);
  fillRect(rgba, 84, 52, 32, 38, 220, 235, 245, 255);
  fillRect(rgba, 88, 38, 24, 18, 217, 131, 36, 255);

  if (stage === "butelkowanie") {
    fillRect(rgba, 138, 120, 14, 50, 220, 235, 245, 255);
    fillRect(rgba, 140, 128, 10, 38, wineRgb[0], wineRgb[1], wineRgb[2], 255);
    fillRect(rgba, 140, 118, 10, 8, 107, 31, 42, 255);
    fillRect(rgba, 158, 132, 12, 42, 220, 235, 245, 255);
    fillRect(rgba, 160, 138, 8, 32, wineRgb[0], wineRgb[1], wineRgb[2], 255);
    const pour = (frame % 8) / 8;
    fillCircleSmooth(rgba, 128 + pour * 6, 108 + pour * 4, 3, 217, 131, 36, 180);
  }

  if (stage === "fermentacja-burzliwa") {
    fillEllipseSmooth(rgba, 100, 98, 34, 10, 245, 208, 216, 230);
    fillEllipseSmooth(rgba, 100, 94, 24, 6, 255, 255, 255, 200);
  }

  if (stage === "fermentacja-cicha") {
    fillEllipseSmooth(rgba, 100, 198, 26, 7, 61, 42, 26, 140);
  }
}

function drawBubbles(rgba, frame, count, speed, intensity) {
  for (let i = 0; i < count; i++) {
    const seed = i * 17.3;
    const bx = 58 + ((seed * 13) % 84);
    const phase = (frame * speed + seed) % 120;
    const by = 190 - phase * (1.2 + intensity);
    const br = 2 + (i % 3) + intensity;
    if (by > 70 && by < 200) {
      fillCircleSmooth(rgba, bx, by, br, 255, 255, 255, 90 + (i % 4) * 25);
    }
  }
}

function frameForStage(stage, frameIndex) {
  const rgba = blankFrame();

  const wines = {
    "fermentacja-burzliwa": [196, 74, 98],
    "fermentacja-cicha": [154, 45, 62],
    dojrzewanie: [107, 31, 42],
    butelkowanie: [90, 28, 38],
  };

  drawCarboyBase(rgba, wines[stage], frameIndex, stage);

  if (stage === "fermentacja-burzliwa") {
    drawBubbles(rgba, frameIndex, 14, 2.2, 1.2);
    drawBubbles(rgba, frameIndex + 3, 8, 1.8, 0.8);
  } else if (stage === "fermentacja-cicha") {
    drawBubbles(rgba, frameIndex, 4, 0.6, 0.4);
  } else if (stage === "dojrzewanie") {
    const shimmer = Math.sin(frameIndex / 4) * 2;
    fillEllipseSmooth(rgba, 72 + shimmer, 120, 8, 40, 255, 255, 255, 18);
  }

  return rgba;
}

function findTransparentIndex(palette) {
  for (let i = 0; i < palette.length; i++) {
    const c = palette[i];
    if (c.length >= 4 && c[3] === 0) return i;
    if (c[0] === 0 && c[1] === 0 && c[2] === 0) return i;
  }
  return 0;
}

function encodeTransparentGif(frames, delay = 110) {
  const format = "rgba4444";
  const encoder = GIFEncoder();
  let globalPalette = null;
  let transparentIndex = 0;

  frames.forEach((rgba, i) => {
    const palette = quantize(rgba, 256, {
      format,
      oneBitAlpha: 128,
      clearAlpha: true,
      clearAlphaThreshold: 16,
      clearAlphaColor: 0x00,
    });
    const index = applyPalette(rgba, palette, format);
    if (i === 0) {
      globalPalette = palette;
      transparentIndex = findTransparentIndex(palette);
    }
    encoder.writeFrame(index, W, H, {
      palette: globalPalette,
      delay,
      transparent: true,
      transparentIndex,
      dispose: 2,
    });
  });

  encoder.finish();
  return Buffer.from(encoder.bytes());
}

const STAGES = [
  "fermentacja-burzliwa",
  "fermentacja-cicha",
  "dojrzewanie",
  "butelkowanie",
];

mkdirSync(OUT_DIR, { recursive: true });

for (const stage of STAGES) {
  const frameCount = stage === "dojrzewanie" ? 10 : 14;
  const frames = Array.from({ length: frameCount }, (_, i) =>
    frameForStage(stage, i),
  );
  const delay = stage === "dojrzewanie" ? 180 : 100;
  const gif = encodeTransparentGif(frames, delay);
  const path = join(OUT_DIR, `${stage}.gif`);
  writeFileSync(path, gif);
  console.log(`OK ${path} (${(gif.length / 1024).toFixed(1)} KB)`);
}
