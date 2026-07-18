// Client-side image pipeline. Every design — AI, upload, or text — is
// finalized here into a 2048px-long-edge, white-background PNG before it is
// uploaded for send-to-print, so the preview is exactly what engraves.

export const FINAL_LONG_EDGE = 2048;

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("PNG export failed"))),
      "image/png",
    );
  });
}

interface FinalizeOptions {
  /** Apply the hard black/white threshold (0–255). Null = grayscale only. */
  threshold: number | null;
}

/**
 * Draw the source at up to FINAL_LONG_EDGE on a white background, convert to
 * grayscale, and optionally hard-threshold to pure 1-bit black/white.
 */
export function renderFinal(
  source: HTMLImageElement | HTMLCanvasElement,
  { threshold }: FinalizeOptions,
): HTMLCanvasElement {
  const srcW = source.width;
  const srcH = source.height;
  const scale = FINAL_LONG_EDGE / Math.max(srcW, srcH);
  const w = Math.round(srcW * scale);
  const h = Math.round(srcH * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  const px = imageData.data;
  for (let i = 0; i < px.length; i += 4) {
    // Flatten any transparency onto white first.
    const a = px[i + 3] / 255;
    const r = px[i] * a + 255 * (1 - a);
    const g = px[i + 1] * a + 255 * (1 - a);
    const b = px[i + 2] * a + 255 * (1 - a);
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const v = threshold === null ? lum : lum < threshold ? 0 : 255;
    px[i] = px[i + 1] = px[i + 2] = v;
    px[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/** Fast preview-sized version of renderFinal for the live threshold slider. */
export function renderPreview(
  source: HTMLImageElement,
  threshold: number | null,
  maxEdge = 640,
): HTMLCanvasElement {
  const scale = Math.min(1, maxEdge / Math.max(source.width, source.height));
  const w = Math.round(source.width * scale);
  const h = Math.round(source.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(source, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  const px = imageData.data;
  for (let i = 0; i < px.length; i += 4) {
    const a = px[i + 3] / 255;
    const r = px[i] * a + 255 * (1 - a);
    const g = px[i + 1] * a + 255 * (1 - a);
    const b = px[i + 2] * a + 255 * (1 - a);
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const v = threshold === null ? lum : lum < threshold ? 0 : 255;
    px[i] = px[i + 1] = px[i + 2] = v;
    px[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export const TEXT_FONTS = [
  { id: "bebas", label: "Hangar Block", css: '"Bebas Neue", sans-serif' },
  { id: "playfair", label: "Classic Serif", css: '"Playfair Display", serif' },
  { id: "pacifico", label: "Script", css: '"Pacifico", cursive' },
  { id: "cinzel", label: "Roman", css: '"Cinzel", serif' },
  { id: "special", label: "Typewriter", css: '"Special Elite", cursive' },
  { id: "rye", label: "Western", css: '"Rye", cursive' },
] as const;

export type TextFontId = (typeof TEXT_FONTS)[number]["id"];

/**
 * Render text (up to 3 lines) centered on a square white canvas in pure black.
 * Used by "Just Text" mode — instant, no AI round trip.
 */
export async function renderText(text: string, fontId: TextFontId): Promise<HTMLCanvasElement> {
  const font = TEXT_FONTS.find((f) => f.id === fontId) ?? TEXT_FONTS[0];
  // Make sure the webfont is actually loaded before measuring.
  try {
    await document.fonts.load(`600 100px ${font.css}`);
    await document.fonts.ready;
  } catch {
    /* fall back to whatever is available */
  }

  const size = FINAL_LONG_EDGE;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 3);
  if (lines.length === 0) return canvas;

  const margin = size * 0.08;
  const maxWidth = size - margin * 2;
  // Binary-search the largest font size where every line fits.
  let lo = 24;
  let hi = 700;
  const fits = (fs: number) => {
    ctx.font = `600 ${fs}px ${font.css}`;
    return lines.every((l) => ctx.measureText(l).width <= maxWidth) &&
      fs * 1.25 * lines.length <= size - margin * 2;
  };
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (fits(mid)) lo = mid;
    else hi = mid - 1;
  }
  const fontSize = lo;
  ctx.font = `600 ${fontSize}px ${font.css}`;
  const lineHeight = fontSize * 1.25;
  const totalH = lineHeight * lines.length;
  lines.forEach((line, i) => {
    const y = size / 2 - totalH / 2 + lineHeight * (i + 0.5);
    ctx.fillText(line, size / 2, y);
  });
  return canvas;
}

/**
 * Branded 1080×1080 share card: navy field, the design on a cream plate,
 * "MADE AT THE HANGAR" footer. For the guest's camera roll / socials.
 */
export async function renderShareCard(
  design: HTMLImageElement | HTMLCanvasElement,
  orderCode: string,
): Promise<HTMLCanvasElement> {
  const size = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#0E2A56";
  ctx.fillRect(0, 0, size, size);

  // Cream plate
  const plate = { x: 90, y: 150, w: size - 180, h: size - 380 };
  ctx.fillStyle = "#F4ECD8";
  ctx.beginPath();
  ctx.roundRect(plate.x, plate.y, plate.w, plate.h, 28);
  ctx.fill();

  // Design centered on the plate
  const pad = 40;
  const availW = plate.w - pad * 2;
  const availH = plate.h - pad * 2;
  const scale = Math.min(availW / design.width, availH / design.height);
  const dw = design.width * scale;
  const dh = design.height * scale;
  ctx.drawImage(design, plate.x + (plate.w - dw) / 2, plate.y + (plate.h - dh) / 2, dw, dh);

  try {
    await document.fonts.load('400 64px "Bebas Neue"');
  } catch {
    /* system fallback is fine */
  }
  ctx.textAlign = "center";
  ctx.fillStyle = "#F5B921";
  ctx.font = '64px "Bebas Neue", sans-serif';
  ctx.fillText("DESIGNED BY ME. MADE IN INDY.", size / 2, 96);
  ctx.fillStyle = "#F4ECD8";
  ctx.font = '44px "Bebas Neue", sans-serif';
  ctx.fillText("HANGAR CUSTOMS · HANGARINDY.COM", size / 2, size - 120);
  ctx.fillStyle = "#B8C4D6";
  ctx.font = '500 26px Inter, sans-serif';
  ctx.fillText(orderCode, size / 2, size - 64);
  return canvas;
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string): void {
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = filename;
  a.click();
}
