import type { Metadata } from "next";
import { GoodsReceiptsView } from "@/components/purchasing/goods-receipts-view";

export const metadata: Metadata = { title: "Goods Receipts" };

export default function GoodsReceiptsPage() {
  return <GoodsReceiptsView />;
}
