import { Suspense } from "react";
import type { Metadata } from "next";
import { ItemsView, ItemsViewFallback } from "@/components/items/items-view";

export const metadata: Metadata = { title: "Items & Products" };

export default function ItemsPage() {
  return (
    // The list reads its state from the URL, so it renders on the client inside Suspense.
    <Suspense fallback={<ItemsViewFallback />}>
      <ItemsView />
    </Suspense>
  );
}
