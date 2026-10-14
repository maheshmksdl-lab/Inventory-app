import type { Metadata } from "next";
import { ItemDetailsView } from "@/components/items/item-details-view";

export const metadata: Metadata = { title: "Item details" };

export default async function ItemPage({ params, searchParams }: PageProps<"/items/[itemId]">) {
  const { itemId } = await params;
  // ?tab=transactions opens a tab directly.
  const { tab } = await searchParams;
  return <ItemDetailsView id={decodeURIComponent(itemId)} initialTab={typeof tab === "string" ? tab : undefined} />;
}
