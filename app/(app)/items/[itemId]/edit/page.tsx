import type { Metadata } from "next";
import { EditItemView } from "@/components/items/item-editor-views";

export const metadata: Metadata = { title: "Edit item" };

export default async function EditItemPage({ params }: PageProps<"/items/[itemId]/edit">) {
  const { itemId } = await params;
  return <EditItemView id={decodeURIComponent(itemId)} />;
}
