import { scoreOutfitColors } from "./colorHarmony";
import { Item, Season } from "./types";

export interface GeneratedOutfit {
  items: Item[];
  colorScore: number;
  /** 0-1: how much the pieces share style tags. null if no item has tags. */
  styleScore: number | null;
  /** True if we had to reuse recently worn pieces to make any outfit at all. */
  usedRecentlyWorn: boolean;
}

export interface GenerateOptions {
  /** Item ids of the outfit currently on screen -- avoid showing it again on reroll. */
  avoid?: string[];
  /** Item ids worn recently -- left out if there's enough else to build an outfit. */
  rest?: Set<string>;
}

function pick<T>(arr: T[]): T | null {
  if (arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Items usable for a given season filter: season-specific items, plus anything tagged all_season. */
function forSeason(items: Item[], season: Season | "all"): Item[] {
  if (season === "all") return items;
  return items.filter((i) => i.season === season || i.season === "all_season");
}

/**
 * Randomly assembles one outfit candidate: either a dress, or a top+bottom,
 * plus optional shoes/outerwear/accessory when available. Returns null if
 * there isn't enough to build a full outfit (e.g. no bottoms yet).
 */
function buildCandidate(pool: Item[]): Item[] | null {
  const dresses = pool.filter((i) => i.category === "dress");
  const tops = pool.filter((i) => i.category === "top");
  const bottoms = pool.filter((i) => i.category === "bottom");
  const outerwear = pool.filter((i) => i.category === "outerwear");
  const shoes = pool.filter((i) => i.category === "shoes");
  const accessories = pool.filter((i) => i.category === "accessory");

  const canDoSeparates = tops.length > 0 && bottoms.length > 0;
  // Use a dress sometimes, or always if there are no top+bottom pairs.
  const useDress = dresses.length > 0 && (!canDoSeparates || Math.random() < 0.35);

  const base: Item[] = [];
  if (useDress) {
    base.push(pick(dresses)!);
  } else if (canDoSeparates) {
    base.push(pick(tops)!, pick(bottoms)!);
  } else {
    return null;
  }

  const shoe = pick(shoes);
  if (shoe) base.push(shoe);

  if (outerwear.length > 0 && Math.random() < 0.5) base.push(pick(outerwear)!);
  if (accessories.length > 0 && Math.random() < 0.4) base.push(pick(accessories)!);

  return base;
}

/**
 * Share of item pairs that have at least one style tag in common, counting
 * only items that have tags. Returns null when fewer than two items are
 * tagged, so untagged wardrobes aren't penalised.
 */
function scoreStyleTags(items: Item[]): number | null {
  const tagged = items.filter((i) => i.style_tags.length > 0);
  if (tagged.length < 2) return null;

  let pairs = 0;
  let shared = 0;
  for (let i = 0; i < tagged.length; i++) {
    const tagsA = new Set(tagged[i].style_tags.map((t) => t.toLowerCase()));
    for (let j = i + 1; j < tagged.length; j++) {
      pairs += 1;
      if (tagged[j].style_tags.some((t) => tagsA.has(t.toLowerCase()))) shared += 1;
    }
  }
  return shared / pairs;
}

/** Overall ranking score: mostly colour, with a nudge towards matching style tags. */
function totalScore(colorScore: number, styleScore: number | null): number {
  return styleScore === null ? colorScore : colorScore * 0.8 + styleScore * 0.2;
}

function searchPool(pool: Item[], avoidKey: string): GeneratedOutfit | null {
  const attempts = 16;
  let best: { outfit: GeneratedOutfit; total: number } | null = null;
  let repeat: GeneratedOutfit | null = null;

  for (let i = 0; i < attempts; i++) {
    const candidate = buildCandidate(pool);
    if (!candidate) return null; // this pool can't make any outfit

    const colorScore = scoreOutfitColors(candidate.map((c) => c.colors));
    const styleScore = scoreStyleTags(candidate);
    const outfit: GeneratedOutfit = {
      items: candidate,
      colorScore,
      styleScore,
      usedRecentlyWorn: false,
    };

    const key = candidate.map((c) => c.id).sort().join(",");
    if (key === avoidKey) {
      repeat = outfit; // only combination available? keep it as a fallback
      continue;
    }

    const total = totalScore(colorScore, styleScore);
    if (!best || total > best.total) best = { outfit, total };
    if (total >= 0.85) break; // good enough -- keeps results varied
  }

  // If every attempt was the outfit already on screen, show it again rather
  // than claiming there's nothing to wear.
  return best?.outfit ?? repeat;
}

/**
 * Generates an outfit for the given season. Samples random candidates and
 * keeps the best one for colour harmony (plus shared style tags), so results
 * feel random but rarely clash. Recently worn items are rested when possible.
 */
export function generateOutfit(
  allItems: Item[],
  season: Season | "all",
  options: GenerateOptions = {}
): GeneratedOutfit | null {
  const pool = forSeason(allItems, season);
  if (pool.length === 0) return null;

  const avoidKey = options.avoid ? [...options.avoid].sort().join(",") : "";

  const rest = options.rest;
  if (rest && rest.size > 0) {
    // Rest worn items category by category: only bring a worn item back if
    // its whole category would otherwise be empty (e.g. she owns one pair of
    // shoes). That way one essential piece doesn't un-rest everything else.
    const restedPool = pool.filter((item) => {
      if (!rest.has(item.id)) return true;
      const hasFreshAlternative = pool.some(
        (other) => other.category === item.category && !rest.has(other.id)
      );
      return !hasFreshAlternative;
    });
    const outfit = searchPool(restedPool, avoidKey) ?? searchPool(pool, avoidKey);
    if (!outfit) return null;
    return { ...outfit, usedRecentlyWorn: outfit.items.some((i) => rest.has(i.id)) };
  }

  return searchPool(pool, avoidKey);
}
