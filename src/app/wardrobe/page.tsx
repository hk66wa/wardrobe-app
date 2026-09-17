"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ItemCard from "@/components/ItemCard";
import { deleteItem, listItems } from "@/lib/wardrobe/api";
import { CATEGORIES, Category, Item } from "@/lib/wardrobe/types";

export default function WardrobePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState<Category | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  async function handleDelete(item: Item, e: React.MouseEvent) {
    // The card itself is a link to the edit page -- stop the click from
    // navigating there before we handle the delete.
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Delete "${item.name || item.category}"? This can't be undone.`)) return;
    setDeletingId(item.id);
    try {
      await deleteItem(item);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete item.");
    } finally {
      setDeletingId(null);
    }
  }

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
          <ItemCard
            key={item.id}
            item={item}
            href={`/wardrobe/${item.id}/edit`}
            topRight={
              <button
                type="button"
                onClick={(e) => handleDelete(item, e)}
                disabled={deletingId === item.id}
                aria-label={`Delete ${item.name || item.category}`}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm active:bg-red-600 disabled:opacity-50"
              >
                {deletingId === item.id ? (
                  <span className="text-xs">…</span>
                ) : (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path
                      fillRule="evenodd"
                      d="M8.5 3.5a.5.5 0 0 0-.5.5v.5H5a.5.5 0 0 0 0 1h.377l.7 9.11A2 2 0 0 0 8.07 16.5h3.86a2 2 0 0 0 1.993-1.89l.7-9.11H15a.5.5 0 0 0 0-1h-3v-.5a.5.5 0 0 0-.5-.5h-3ZM8 5h4v-.5H8V5Zm-.62 1 .67 8.72a1 1 0 0 0 1 .78h3.86a1 1 0 0 0 1-.78L14.62 6H7.38Z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            }
          />
        ))}
      </div>
    </main>
  );
}
