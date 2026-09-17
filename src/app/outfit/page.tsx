"use client";

import { useEffect, useState } from "react";
import ItemCard from "@/components/ItemCard";
import { listItems, logWornOutfit, recentlyWornItemIds } from "@/lib/wardrobe/api";
import { generateOutfit, GeneratedOutfit } from "@/lib/wardrobe/generateOutfit";
import { Item, Season } from "@/lib/wardrobe/types";

const SEASON_OPTIONS: { label: string; value: Season | "all" }[] = [
  { label: "Summer", value: "summer" },
  { label: "Winter", value: "winter" },
  { label: "Any", value: "all" },
];

/** How many days a worn item is rested before it can come back into outfits. */
const REST_DAYS = 3;

export default function OutfitPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [rest, setRest] = useState<Set<string>>(new Set());
  const [season, setSeason] = useState<Season | "all">("summer");
  const [outfit, setOutfit] = useState<GeneratedOutfit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logState, setLogState] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    Promise.all([listItems(), recentlyWornItemIds(REST_DAYS)])
      .then(([loadedItems, worn]) => {
        setItems(loadedItems);
        setRest(worn);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load wardrobe."))
      .finally(() => setLoading(false));
  }, []);

  function roll() {
    const next = generateOutfit(items, season, {
      avoid: outfit?.items.map((i) => i.id),
      rest,
    });
    setOutfit(next);
    setLogState("idle");
  }

  // Re-roll automatically when the season changes or items finish loading.
  useEffect(() => {
    if (!loading) roll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [season, loading]);

  async function wearThis() {
    if (!outfit) return;
    setLogState("saving");
    try {
      const ids = outfit.items.map((i) => i.id);
      await logWornOutfit(ids);
      // Rest these pieces for future rerolls in this session too.
      setRest((prev) => new Set([...prev, ...ids]));
      setLogState("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save outfit.");
      setLogState("idle");
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold">Today&apos;s outfit</h1>

      <div className="mb-6 flex gap-2">
        {SEASON_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSeason(opt.value)}
            className={`rounded-full border px-4 py-1.5 text-sm ${
              season === opt.value ? "border-black bg-black text-white" : "border-black/15 text-black/70"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-black/50">Loading wardrobe...</p>}

      {!loading && !outfit && (
        <p className="mb-4 text-sm text-black/50">
          Not enough cataloged yet for this season -- add at least a top and a bottom (or a dress)
          tagged for it.
        </p>
      )}

      {outfit && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {outfit.items.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
          <p className="mb-1 text-xs text-black/40">
            Colour match: {Math.round(outfit.colorScore * 100)}%
            {outfit.styleScore !== null && ` · Style match: ${Math.round(outfit.styleScore * 100)}%`}
          </p>
          {outfit.usedRecentlyWorn && (
            <p className="mb-1 text-xs text-black/40">
              Includes something worn in the last {REST_DAYS} days -- not enough else to choose from.
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <button
              onClick={wearThis}
              disabled={logState !== "idle"}
              className="flex-1 rounded-lg border border-black px-4 py-3 text-sm font-medium disabled:opacity-60"
            >
              {logState === "saved" ? "Logged ✓" : logState === "saving" ? "Saving..." : "Wearing this today"}
            </button>
          </div>
        </>
      )}

      <button
        onClick={roll}
        disabled={loading || items.length === 0}
        className="mt-2 w-full rounded-lg bg-black px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
      >
        Reroll
      </button>
    </main>
  );
}
