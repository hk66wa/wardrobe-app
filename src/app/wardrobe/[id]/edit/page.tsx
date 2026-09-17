"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ItemForm from "@/components/ItemForm";
import { archiveItem, getItem, imageUrl, updateItem, uploadItemPhoto } from "@/lib/wardrobe/api";
import { Item } from "@/lib/wardrobe/types";

export default function EditItemPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getItem(id)
      .then((found) => {
        if (!found) setError("That item doesn't exist anymore.");
        setItem(found);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load item."))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleArchive() {
    if (!item) return;
    if (!window.confirm("Archive this item? It won't show up in outfits anymore.")) return;
    try {
      await archiveItem(item.id);
      router.push("/wardrobe");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't archive item.");
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Edit item</h1>
        <Link href="/wardrobe" className="text-sm text-black/50 underline">
          Cancel
        </Link>
      </div>

      {loading && <p className="text-sm text-black/50">Loading...</p>}
      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {item && (
        <>
          <ItemForm
            initial={{
              name: item.name ?? "",
              category: item.category,
              season: item.season,
              colors: item.colors,
              style_tags: item.style_tags,
            }}
            existingImageUrl={imageUrl(item.image_path)}
            submitLabel="Save changes"
            onSubmit={async (fields, photo) => {
              const newImagePath = photo ? await uploadItemPhoto(photo) : undefined;
              await updateItem(item, fields, newImagePath);
              router.push("/wardrobe");
            }}
          />
          <button
            type="button"
            onClick={handleArchive}
            className="mt-4 w-full rounded-lg border border-red-200 px-4 py-3 text-sm font-medium text-red-700"
          >
            Archive item
          </button>
        </>
      )}
    </main>
  );
}
