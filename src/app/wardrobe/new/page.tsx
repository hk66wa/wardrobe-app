"use client";

import { useRouter } from "next/navigation";
import ItemForm from "@/components/ItemForm";
import { createItem, uploadItemPhoto } from "@/lib/wardrobe/api";

export default function NewItemPage() {
  const router = useRouter();

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold">Add an item</h1>
      <ItemForm
        submitLabel="Save item"
        onSubmit={async (fields, photo) => {
          if (!photo) throw new Error("Add a photo of the item first.");
          const imagePath = await uploadItemPhoto(photo);
          await createItem({ ...fields, imagePath });
          router.push("/wardrobe");
        }}
      />
    </main>
  );
}
