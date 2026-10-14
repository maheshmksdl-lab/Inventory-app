import type { Metadata } from "next";
import { TransferDetailView } from "@/components/transfers/transfer-detail-view";

export const metadata: Metadata = { title: "Transfer" };

export default async function TransferPage({ params }: PageProps<"/stock-transfers/[transferId]">) {
  const { transferId } = await params;
  return <TransferDetailView id={decodeURIComponent(transferId)} />;
}
