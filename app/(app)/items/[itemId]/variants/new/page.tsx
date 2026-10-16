import type { Metadata } from "next";
import { NewVariantView } from "@/components/items/item-editor-views";

export const metadata: Metadata = { title: "Add variant" };

export default async function NewVariantPage({ params }: PageProps<"/items/[itemId]/variants/new">) {
  const { itemId } = await params;
  return <NewVariantView parentId={decodeURIComponent(itemId)} />;
}
