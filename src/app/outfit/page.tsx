"use client";

import { useEffect, useState } from "react";
import ItemCard from "@/components/ItemCard";
import { imageUrl, listItems, logWornOutfit, recentlyWornItemIds } from "@/lib/wardrobe/api";
import { generateCollage } from "@/lib/wardrobe/collage";
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
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logState, setLogState] = useState<"idle" | "saving" | "saved">("idle");
  const [collageUrl, setCollageUrl] = useState<string | null>(null);
  const [collageLoading, setCollageLoading] = useState(false);
  const [collageError, setCollageError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listItems(), recentlyWornItemIds(REST_DAYS)])
      .then(([loadedItems, worn]) => {
        setItems(loadedItems);
        setRest(worn);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load wardrobe."))
      .finally(() => setLoading(false));
  }, []);

  function clearCollage() {
    setCollageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setCollageError(null);
  }

  function roll() {
    const locked = outfit?.items.filter((i) => lockedIds.has(i.id)) ?? [];
    const next = generateOutfit(items, season, {
      avoid: outfit?.items.map((i) => i.id),
      rest,
      locked,
    });
    setOutfit(next);
    setLogState("idle");
    clearCollage();
  }

  function changeSeason(next: Season | "all") {
    setSeason(next);
    setLockedIds(new Set()); // locked pieces may not fit the new season
  }

  function toggleLock(id: string) {
    setLockedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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

  async function makeCollage() {
    if (!outfit) return;
    setCollageLoading(true);
    setCollageError(null);
    try {
      const blob = await generateCollage(outfit.items.map((i) => ({ url: imageUrl(i.image_path) })));
      setCollageUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
    } catch (err) {
      setCollageError(err instanceof Error ? err.message : "Couldn't generate the collage.");
    } finally {
      setCollageLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold">Today&apos;s outfit</h1>

      <div className="mb-6 flex gap-2">
        {SEASON_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => changeSeason(opt.value)}
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
            {outfit.items.map((item) => {
              const isLocked = lockedIds.has(item.id);
              return (
                <ItemCard
                  key={item.id}
                  item={item}
                  topRight={
                    <button
                      type="button"
                      onClick={() => toggleLock(item.id)}
                      aria-label={isLocked ? `Unlock ${item.name || item.category}` : `Lock ${item.name || item.category}`}
                      aria-pressed={isLocked}
                      className={`flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-sm ${
                        isLocked ? "bg-white text-black" : "bg-black/50 text-white"
                      }`}
                    >
                      {isLocked ? (
                        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                          <path d="M5 8V6a5 5 0 0 1 10 0v2h.5A1.5 1.5 0 0 1 17 9.5v7A1.5 1.5 0 0 1 15.5 18h-11A1.5 1.5 0 0 1 3 16.5v-7A1.5 1.5 0 0 1 4.5 8H5Zm1.5 0h7V6a3.5 3.5 0 0 0-7 0v2Z" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                          <path d="M15 8V6a5 5 0 0 0-9.9-.9.75.75 0 1 0 1.48.26A3.5 3.5 0 0 1 13.5 6v2h-9A1.5 1.5 0 0 0 3 9.5v7A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 15.5 8H15Z" />
                        </svg>
                      )}
                    </button>
                  }
                />
              );
            })}
          </div>
          <p className="mb-1 text-xs text-black/40">
            Colour match: {Math.round(outfit.colorScore * 100)}%
            {outfit.styleScore !== null && ` · Style match: ${Math.round(outfit.styleScore * 100)}%`}
          </p>
          {lockedIds.size > 0 && (
            <p className="mb-1 text-xs text-black/40">
              {lockedIds.size} piece{lockedIds.size > 1 ? "s" : ""} locked -- reroll will keep{" "}
              {lockedIds.size > 1 ? "them" : "it"} and change the rest.
            </p>
          )}
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

          <button
            onClick={makeCollage}
            disabled={collageLoading}
            className="mt-2 w-full rounded-lg border border-black/15 px-4 py-3 text-sm font-medium disabled:opacity-60"
          >
            {collageLoading ? "Generating collage..." : "Generate collage"}
          </button>
          {collageError && <p className="mt-2 text-sm text-red-600">{collageError}</p>}
          {collageUrl && (
            <div className="mt-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={collageUrl} alt="Outfit collage" className="w-full rounded-lg border border-black/10" />
              <a
                href={collageUrl}
                download="outfit-collage.png"
                className="mt-2 block w-full rounded-lg bg-black px-4 py-3 text-center text-sm font-medium text-white"
              >
                Save image
              </a>
            </div>
          )}
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
