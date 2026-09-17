"use client";

interface ColorPickerProps {
  colors: string[];
  onChange: (colors: string[]) => void;
}

/** Lets the user tag an item with one or more colors (swatches + add/remove). */
export default function ColorPicker({ colors, onChange }: ColorPickerProps) {
  function updateColor(index: number, value: string) {
    const next = [...colors];
    next[index] = value;
    onChange(next);
  }

  function removeColor(index: number) {
    onChange(colors.filter((_, i) => i !== index));
  }

  function addColor() {
    onChange([...colors, "#000000"]);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {colors.map((color, i) => (
        <div key={i} className="flex items-center gap-1">
          <input
            type="color"
            value={color}
            onChange={(e) => updateColor(i, e.target.value)}
            className="h-9 w-9 cursor-pointer rounded border border-black/10"
            aria-label={`Color ${i + 1}`}
          />
          <button
            type="button"
            onClick={() => removeColor(i)}
            className="text-xs text-black/40 hover:text-black/70"
            aria-label={`Remove color ${i + 1}`}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addColor}
        className="rounded border border-dashed border-black/20 px-3 py-2 text-sm text-black/60 hover:border-black/40"
      >
        + Color
      </button>
    </div>
  );
}
