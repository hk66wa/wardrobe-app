"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ItemCard from "@/components/ItemCard";
import { listItems } from "@/lib/wardrobe/api";
import { CATEGORIES, Category, Item } from "@/lib/wardrobe/types";

export default function WardrobePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState<Category | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await listItems();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load wardrobe.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const visible = filter === "all" ? items : items.filter((i) => i.category === filter);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Wardrobe</h1>
        <Link
          href="/wardrobe/new"
          className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white"
        >
          + Add item
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-full border px-3 py-1.5 text-sm capitalize ${
            filter === "all" ? "border-black bg-black text-white" : "border-black/15"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`rounded-full border px-3 py-1.5 text-sm capitalize ${
              filter === c ? "border-black bg-black text-white" : "border-black/15"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-black/50">Loading...</p>}

      {!loading && visible.length === 0 && (
        <p className="text-sm text-black/50">
          No items yet. Tap &quot;Add item&quot; to start cataloging.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {visible.map((item) => (
          <ItemCard key={item.id} item={item} href={`/wardrobe/${item.id}/edit`} />
        ))}
      </div>
    </main>
  );
}
