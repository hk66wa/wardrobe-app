import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "./image";
import { Category, Item, Season } from "./types";

const BUCKET = "wardrobe-photos";

/**
 * `crypto.randomUUID()` is only available in "secure contexts" (https, or
 * localhost on desktop). Testing over a plain http:// LAN address on a phone
 * -- which is the easiest way to try the camera upload flow -- is NOT a
 * secure context, so that call throws there. This falls back to a
 * good-enough random id in that case instead of failing the upload.
 */
function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function listItems(opts?: {
  category?: Category;
  season?: Season;
  includeArchived?: boolean;
}): Promise<Item[]> {
  const supabase = createClient();
  let query = supabase.from("items").select("*").order("created_at", { ascending: false });

  if (!opts?.includeArchived) query = query.eq("archived", false);
  if (opts?.category) query = query.eq("category", opts.category);
  if (opts?.season) query = query.in("season", [opts.season, "all_season"]);

  const { data, error } = await query;
  if (error) throw error;
  return data as Item[];
}

export function imageUrl(imagePath: string): string {
  const supabase = createClient();
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(imagePath);
  return data.publicUrl;
}

export async function uploadItemPhoto(original: File): Promise<string> {
  const supabase = createClient();
  // Shrink phone photos (often several MB) before they hit storage.
  const file = await resizeImage(original);
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${generateId()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  return path;
}

export async function getItem(id: string): Promise<Item | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("items").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as Item | null) ?? null;
}

export interface ItemFields {
  name: string;
  category: Category;
  season: Season;
  colors: string[];
  style_tags: string[];
}

/**
 * Updates an item's details. If `newImagePath` is given, the item's photo is
 * swapped and the old photo file is removed from storage.
 */
export async function updateItem(
  item: Item,
  fields: ItemFields,
  newImagePath?: string
): Promise<Item> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("items")
    .update({
      name: fields.name || null,
      category: fields.category,
      season: fields.season,
      colors: fields.colors,
      style_tags: fields.style_tags,
      ...(newImagePath ? { image_path: newImagePath } : {}),
    })
    .eq("id", item.id)
    .select()
    .single();
  if (error) throw error;

  if (newImagePath && newImagePath !== item.image_path) {
    // Best effort -- a leftover old photo isn't worth failing the save over.
    await supabase.storage.from(BUCKET).remove([item.image_path]);
  }
  return data as Item;
}

/** Records that an outfit was actually worn today. */
export async function logWornOutfit(itemIds: string[]): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("outfit_log").insert({ item_ids: itemIds, worn: true });
  if (error) throw error;
}

/** Ids of every item worn in the last `days` days, so the generator can rest them. */
export async function recentlyWornItemIds(days = 3): Promise<Set<string>> {
  const supabase = createClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("outfit_log")
    .select("item_ids")
    .eq("worn", true)
    .gte("created_at", since);
  if (error) throw error;
  return new Set((data ?? []).flatMap((row: { item_ids: string[] }) => row.item_ids));
}

export async function createItem(input: {
  name: string;
  category: Category;
  season: Season;
  colors: string[];
  style_tags: string[];
  imagePath: string;
}): Promise<Item> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("items")
    .insert({
      name: input.name || null,
      category: input.category,
      season: input.season,
      colors: input.colors,
      style_tags: input.style_tags,
      image_path: input.imagePath,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Item;
}

export async function archiveItem(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("items").update({ archived: true }).eq("id", id);
  if (error) throw error;
}

export async function deleteItem(item: Item): Promise<void> {
  const supabase = createClient();
  await supabase.storage.from(BUCKET).remove([item.image_path]);
  const { error } = await supabase.from("items").delete().eq("id", item.id);
  if (error) throw error;
}
