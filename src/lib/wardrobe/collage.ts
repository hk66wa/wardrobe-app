/**
 * Composites a set of item photos into one shareable "outfit collage" image,
 * entirely client-side (no AI, no external service -- free).
 *
 * Photos with a transparent background (see resizeImage in image.ts, and the
 * "cut the background out on your phone first" workflow) are floated at a
 * slight rotation with a soft shadow, like a flat-lay. Regular photos --
 * which still have their real background -- are placed in tidy rounded grid
 * tiles instead, so the collage looks intentional either way.
 */

export interface CollagePiece {
  url: string;
}

export async function generateCollage(pieces: CollagePiece[]): Promise<Blob> {
  if (pieces.length === 0) throw new Error("Nothing to put in a collage yet.");

  const size = 960;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Collages aren't supported in this browser.");

  ctx.fillStyle = "#f7f5f2";
  ctx.fillRect(0, 0, size, size);

  const images = await Promise.all(pieces.map((p) => loadImage(p.url)));

  const cols = images.length <= 2 ? images.length : images.length <= 4 ? 2 : 3;
  const rows = Math.ceil(images.length / cols);
  const pad = 28;
  const cellW = (size - pad * (cols + 1)) / cols;
  const cellH = (size - pad * (rows + 1)) / rows;

  images.forEach((img, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = pad + col * (cellW + pad) + cellW / 2;
    const cy = pad + row * (cellH + pad) + cellH / 2;

    const floating = hasTransparentCorners(img);

    ctx.save();
    ctx.translate(cx, cy);
    if (floating) {
      const angle = ((Math.random() * 10 - 5) * Math.PI) / 180;
      ctx.rotate(angle);
      ctx.shadowColor = "rgba(0,0,0,0.18)";
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 8;
      drawContain(ctx, img, cellW * 0.85, cellH * 0.85);
    } else {
      roundedClipPath(ctx, -cellW / 2, -cellH / 2, cellW, cellH, 14);
      ctx.clip();
      drawCover(ctx, img, cellW, cellH);
    }
    ctx.restore();
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Couldn't export the collage image."));
    }, "image/png");
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error("Couldn't load one of the photos for the collage."));
    img.src = url;
  });
}

/** Best-effort check for a transparent background: samples the four corners. */
function hasTransparentCorners(img: HTMLImageElement): boolean {
  try {
    const s = 16;
    const c = document.createElement("canvas");
    c.width = s;
    c.height = s;
    const cx = c.getContext("2d", { willReadFrequently: true });
    if (!cx) return false;
    cx.drawImage(img, 0, 0, s, s);
    const { data } = cx.getImageData(0, 0, s, s);
    const corners = [0, s - 1, (s - 1) * s, (s - 1) * s + (s - 1)].map((p) => p * 4 + 3);
    return corners.filter((idx) => data[idx] < 200).length >= 3;
  } catch {
    // Cross-origin canvas read blocked -- fall back to the plain grid look.
    return false;
  }
}

function drawContain(ctx: CanvasRenderingContext2D, img: HTMLImageElement, maxW: number, maxH: number) {
  const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.naturalWidth - sw) / 2;
  const sy = (img.naturalHeight - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, -w / 2, -h / 2, w, h);
}

function roundedClipPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
