"use client";

import Link from "next/link";
import { imageUrl } from "@/lib/wardrobe/api";
import { Item } from "@/lib/wardrobe/types";

/**
 * Photo card for one item. When `href` is given the whole card is tappable
 * (used in the wardrobe grid to open the edit page). There's deliberately no
 * hover-only button here: hover doesn't exist on phones, so actions live on
 * the edit page instead.
 */
export default function ItemCard({ item, href }: { item: Item; href?: string }) {
  const body = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl(item.image_path)}
        alt={item.name ?? item.category}
        loading="lazy"
        className="aspect-square w-full object-cover"
      />
      <div className="p-2">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium capitalize">{item.name || item.category}</p>
          {href && <span className="shrink-0 text-xs text-black/40">Edit</span>}
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xs capitalize text-black/50">
            {item.category} · {item.season.replace("_", " ")}
          </span>
          <div className="flex gap-1">
            {item.colors.slice(0, 4).map((c, i) => (
              <span
                key={i}
                className="h-3 w-3 rounded-full border border-black/10"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );

  const className = "block overflow-hidden rounded-lg border border-black/10";
  return href ? (
    <Link href={href} className={`${className} active:opacity-70`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
