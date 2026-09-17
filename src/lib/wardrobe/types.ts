export type Category = "top" | "bottom" | "dress" | "outerwear" | "shoes" | "accessory";
export type Season = "summer" | "winter" | "all_season";

export interface Item {
  id: string;
  created_at: string;
  name: string | null;
  category: Category;
  season: Season;
  image_path: string;
  colors: string[];
  style_tags: string[];
  archived: boolean;
}

export interface OutfitLogEntry {
  id: string;
  created_at: string;
  item_ids: string[];
  worn: boolean;
}

export const CATEGORIES: Category[] = [
  "top",
  "bottom",
  "dress",
  "outerwear",
  "shoes",
  "accessory",
];

export const SEASONS: Season[] = ["summer", "winter", "all_season"];
