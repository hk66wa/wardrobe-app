"use client";

import { useState } from "react";
import ColorPicker from "@/components/ColorPicker";
import WebcamCapture from "@/components/WebcamCapture";
import type { ItemFields } from "@/lib/wardrobe/api";
import { extractColors } from "@/lib/wardrobe/image";
import { CATEGORIES, Category, Season, SEASONS } from "@/lib/wardrobe/types";

interface ItemFormProps {
  /** Starting values when editing an existing item. */
  initial?: ItemFields;
  /** Photo already saved for this item (edit mode) -- a new photo is optional. */
  existingImageUrl?: string;
  submitLabel: string;
  onSubmit: (fields: ItemFields, photo: File | null) => Promise<void>;
}

export default function ItemForm({ initial, existingImageUrl, submitLabel, onSubmit }: ItemFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [showWebcam, setShowWebcam] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState<Category>(initial?.category ?? "top");
  const [season, setSeason] = useState<Season>(initial?.season ?? "all_season");
  // No default colour: an untouched black swatch used to silently skew outfit scoring.
  const [colors, setColors] = useState<string[]>(initial?.colors ?? []);
  const [colorsAuto, setColorsAuto] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [styleTagsInput, setStyleTagsInput] = useState(initial?.style_tags.join(", ") ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setPhoto(f: File | null) {
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
    if (!f) return;

    // Pre-fill colours from the new photo.
    setDetecting(true);
    try {
      const detected = await extractColors(f);
      if (detected.length > 0) {
        setColors(detected);
        setColorsAuto(true);
      }
    } catch {
      // Detection is a convenience -- if it fails, colours are just picked by hand.
    } finally {
      setDetecting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file && !existingImageUrl) {
      setError("Add a photo of the item first.");
      return;
    }
    if (colors.length === 0) {
      setError("Add at least one colour -- outfit matching depends on it.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(
        {
          name,
          category,
          season,
          colors,
          style_tags: styleTagsInput
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        },
        file
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  const shownImage = preview ?? existingImageUrl ?? null;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <label className="mb-2 block text-sm font-medium">Photo</label>
        <div className="flex flex-wrap items-center gap-3">
          {/* No `capture` attribute: on iPhone this offers Photo Library as well as the camera. */}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            className="block min-w-0 flex-1 text-sm"
          />
          {!showWebcam && (
            <button
              type="button"
              onClick={() => setShowWebcam(true)}
              className="rounded-lg border border-black/15 px-3 py-2 text-sm"
            >
              Use webcam
            </button>
          )}
        </div>
        {showWebcam && (
          <WebcamCapture
            onCapture={(f) => {
              setPhoto(f);
              setShowWebcam(false);
            }}
            onClose={() => setShowWebcam(false)}
          />
        )}
        {shownImage && !showWebcam && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shownImage} alt="Item photo" className="mt-3 h-56 w-full rounded-lg object-cover" />
        )}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Name (optional)</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Blue linen shirt"
          className="w-full rounded border border-black/15 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
          className="w-full rounded border border-black/15 px-3 py-2 text-sm capitalize"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Season</label>
        <div className="flex gap-2">
          {SEASONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSeason(s)}
              className={`rounded-full border px-3 py-1.5 text-sm capitalize ${
                season === s ? "border-black bg-black text-white" : "border-black/15 text-black/70"
              }`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Colours</label>
        {detecting && <p className="mb-2 text-xs text-black/50">Detecting colours from photo...</p>}
        {!detecting && colorsAuto && (
          <p className="mb-2 text-xs text-black/50">
            Detected from the photo -- tap a swatch to adjust, or ✕ to remove background colours.
          </p>
        )}
        {!detecting && colors.length === 0 && (
          <p className="mb-2 text-xs text-black/50">Add a photo to detect colours, or add them by hand.</p>
        )}
        <ColorPicker
          colors={colors}
          onChange={(next) => {
            setColors(next);
            setColorsAuto(false);
          }}
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Style tags (optional, comma-separated)</label>
        <input
          type="text"
          value={styleTagsInput}
          onChange={(e) => setStyleTagsInput(e.target.value)}
          placeholder="e.g. minimalist, smart-casual"
          className="w-full rounded border border-black/15 px-3 py-2 text-sm"
        />
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting || detecting}
        className="rounded-lg bg-black px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
      >
        {submitting ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
