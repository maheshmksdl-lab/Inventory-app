import type { Metadata } from "next";
import { NewItemView } from "@/components/items/item-editor-views";
import type { ItemType } from "@/lib/types/inventory";

export const metadata: Metadata = { title: "New item" };

const TYPES: ItemType[] = ["goods", "service", "composite"];

export default async function NewItemPage({ searchParams }: PageProps<"/items/new">) {
  // ?type=service starts on that type; ?clone=<id> copies an existing item.
  const { type, clone } = await searchParams;
  return <NewItemView key={String(clone ?? type)} type={TYPES.find((t) => t === type)} cloneId={typeof clone === "string" ? clone : undefined} />;
}
