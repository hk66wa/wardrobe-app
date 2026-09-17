/**
 * Basic color-theory rules for deciding whether a set of clothing colors
 * "work together". No AI needed here -- just HSL math.
 *
 * The rules implemented:
 *  - Neutrals (black, white, grey, beige/navy-ish low-saturation colors)
 *    are treated as always matching anything.
 *  - Monochrome: same hue family, different lightness -> good match.
 *  - Analogous: hues within ~40 degrees of each other -> good match.
 *  - Complementary: hues roughly opposite (~150-210 degrees apart) -> good match.
 *  - Anything else (clashing hues, e.g. ~90 degrees apart) scores lower.
 */

export interface Hsl {
  h: number; // 0-360
  s: number; // 0-1
  l: number; // 0-1
}

export function hexToHsl(hex: string): Hsl {
  const clean = hex.replace("#", "");
  const bigint = parseInt(
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean,
    16
  );
  const r = ((bigint >> 16) & 255) / 255;
  const g = ((bigint >> 8) & 255) / 255;
  const b = (bigint & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
      break;
    case g:
      h = ((b - r) / d + 2) * 60;
      break;
    default:
      h = ((r - g) / d + 4) * 60;
  }

  return { h, s, l };
}

/** Low-saturation or extreme-lightness colors (black/white/grey/beige/navy-ish) act as neutrals. */
export function isNeutral(hsl: Hsl): boolean {
  return hsl.s < 0.15 || hsl.l < 0.12 || hsl.l > 0.92;
}

function hueDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

/** Pairwise harmony score between two colors, 0 (clash) to 1 (great match). */
export function pairScore(hexA: string, hexB: string): number {
  const a = hexToHsl(hexA);
  const b = hexToHsl(hexB);

  if (isNeutral(a) || isNeutral(b)) return 0.9; // neutrals go with almost everything

  const dist = hueDistance(a.h, b.h);

  if (dist < 15) return 1; // monochrome / same hue family
  if (dist <= 40) return 0.85; // analogous
  if (dist >= 150 && dist <= 210) return 0.8; // complementary
  if (dist <= 70) return 0.4; // near-clash (e.g. yellow-green vs blue-green)
  return 0.55; // everything else -- not a classic pairing but not a hard clash
}

/**
 * Score an entire outfit (one or more items, each with a list of colors --
 * an item can have multiple colors, e.g. a striped shirt). Returns 0-1,
 * the average of the best pairwise match between every pair of items.
 */
export function scoreOutfitColors(itemColorSets: string[][]): number {
  const nonEmpty = itemColorSets.filter((c) => c.length > 0);
  if (nonEmpty.length < 2) return 1; // nothing to clash with

  let total = 0;
  let pairs = 0;

  for (let i = 0; i < nonEmpty.length; i++) {
    for (let j = i + 1; j < nonEmpty.length; j++) {
      // Best-case pairing between the two items' color palettes.
      let best = 0;
      for (const colorA of nonEmpty[i]) {
        for (const colorB of nonEmpty[j]) {
          best = Math.max(best, pairScore(colorA, colorB));
        }
      }
      total += best;
      pairs += 1;
    }
  }

  return pairs === 0 ? 1 : total / pairs;
}
