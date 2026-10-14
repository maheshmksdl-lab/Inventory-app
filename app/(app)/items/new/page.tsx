import type { Metadata } from "next";
import { NewItemView } from "@/components/items/item-editor-views";

export const metadata: Metadata = { title: "New item" };

export default function NewItemPage() {
  return <NewItemView />;
}
