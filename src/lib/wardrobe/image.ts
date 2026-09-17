/**
 * Browser-side image helpers: shrinking photos before upload, and guessing an
 * item's main colours from its photo so they don't have to be picked by hand.
 */

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't read that image."));
    };
    img.src = url;
  });
}

/**
 * Quick check for see-through pixels, used to decide whether a resize can
 * safely flatten to JPEG (no alpha channel) or needs to stay PNG (has one).
 * Only formats that support alpha are worth checking; JPEG source photos
 * never have transparency. Samples a small downscaled copy rather than the
 * full-resolution canvas so this stays cheap even for large photos.
 */
function hasTransparency(img: HTMLImageElement): boolean {
  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return false;
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(img, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true;
  }
  return false;
}

/**
 * Downscales a photo so its longest side is at most `maxSize` px. Phone
 * photos are often 3-5 MB; this gets them to a few hundred KB so the
 * wardrobe grid loads quickly on mobile data. Re-encodes as JPEG normally,
 * but if the source is a format that can carry transparency (PNG/WebP/GIF)
 * and actually has see-through pixels -- e.g. a background-removed item photo
 * for the outfit collage -- it's kept as PNG instead, since JPEG would
 * flatten the transparent areas to solid black. If anything goes wrong (e.g.
 * an image format the browser can't decode), the original file is returned
 * unchanged so the upload still works.
 */
export async function resizeImage(file: File, maxSize = 1024, quality = 0.85): Promise<File> {
  try {
    const img = await loadImage(file);
    const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);

    const canAlpha = /^image\/(png|webp|gif)$/.test(file.type);
    const keepAlpha = canAlpha && hasTransparency(img);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    if (keepAlpha) ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const outputType = keepAlpha ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outputType, keepAlpha ? undefined : quality)
    );
    if (!blob || blob.size >= file.size) return file; // don't make small files bigger

    const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
    const ext = keepAlpha ? "png" : "jpg";
    return new File([blob], `${baseName}.${ext}`, { type: outputType });
  } catch {
    return file;
  }
}

function toHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

/**
 * Guesses the dominant colours of the clothing item in a photo.
 *
 * How: shrink the image to 48x48, look only at the central area (clothes are
 * usually centred and the edges are usually background -- floor, bed, wall),
 * group similar pixels into buckets, then merge buckets that are close in
 * colour. Returns up to `max` hex colours, most common first, skipping any
 * that make up only a small sliver of the item.
 *
 * It's a best guess -- the form shows the result so it can be corrected.
 */
export async function extractColors(file: File, max = 3): Promise<string[]> {
  const img = await loadImage(file);
  const size = 48;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];

  // Draw a centred square crop covering the middle 70% of the photo.
  const crop = Math.min(img.naturalWidth, img.naturalHeight) * 0.7;
  const sx = (img.naturalWidth - crop) / 2;
  const sy = (img.naturalHeight - crop) / 2;
  ctx.drawImage(img, sx, sy, crop, crop, 0, 0, size, size);

  const { data } = ctx.getImageData(0, 0, size, size);

  // Bucket pixels by colour (5 bits per channel = 32 levels each).
  const buckets = new Map<number, { r: number; g: number; b: number; count: number }>();
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue; // skip transparent pixels
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      bucket.count += 1;
    } else {
      buckets.set(key, { r, g, b, count: 1 });
    }
    total += 1;
  }
  if (total === 0) return [];

  // Merge near-identical buckets into clusters, largest first.
  const sorted = [...buckets.values()]
    .map((bk) => ({ r: bk.r / bk.count, g: bk.g / bk.count, b: bk.b / bk.count, count: bk.count }))
    .sort((a, b) => b.count - a.count);

  const clusters: { r: number; g: number; b: number; count: number }[] = [];
  const mergeDistance = 60; // RGB distance under which two colours count as the same
  for (const c of sorted) {
    const match = clusters.find(
      (k) => Math.hypot(k.r - c.r, k.g - c.g, k.b - c.b) < mergeDistance
    );
    if (match) {
      const n = match.count + c.count;
      match.r = (match.r * match.count + c.r * c.count) / n;
      match.g = (match.g * match.count + c.g * c.count) / n;
      match.b = (match.b * match.count + c.b * c.count) / n;
      match.count = n;
    } else {
      clusters.push({ ...c });
    }
  }

  return clusters
    .sort((a, b) => b.count - a.count)
    .filter((c) => c.count / total >= 0.1) // ignore colours under 10% of the item
    .slice(0, max)
    .map((c) => toHex(c.r, c.g, c.b));
}
