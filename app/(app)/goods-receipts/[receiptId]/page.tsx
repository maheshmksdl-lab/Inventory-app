import type { Metadata } from "next";
import { ReceiptDetailView } from "@/components/purchasing/receipt-detail-view";

export const metadata: Metadata = { title: "Goods receipt" };

export default async function ReceiptPage({ params }: PageProps<"/goods-receipts/[receiptId]">) {
  const { receiptId } = await params;
  return <ReceiptDetailView id={decodeURIComponent(receiptId)} />;
}
