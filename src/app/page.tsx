import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-8 px-4 py-8 text-center">
      <div>
        <h1 className="text-2xl font-semibold">What to wear</h1>
        <p className="mt-2 text-sm text-black/50">
          Catalog the wardrobe, then let it pick an outfit.
        </p>
      </div>

      <div className="flex w-full flex-col gap-3">
        <Link
          href="/outfit"
          className="rounded-lg bg-black px-4 py-3 text-sm font-medium text-white"
        >
          Generate an outfit
        </Link>
        <Link
          href="/wardrobe"
          className="rounded-lg border border-black/15 px-4 py-3 text-sm font-medium"
        >
          Browse wardrobe
        </Link>
        <Link
          href="/wardrobe/new"
          className="rounded-lg border border-black/15 px-4 py-3 text-sm font-medium"
        >
          Add an item
        </Link>
      </div>
    </main>
  );
}
