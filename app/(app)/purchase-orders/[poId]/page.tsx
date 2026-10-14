import type { Metadata } from "next";
import { PoDetailView } from "@/components/purchasing/po-detail-view";

export const metadata: Metadata = { title: "Purchase order" };

export default async function PurchaseOrderPage({ params }: PageProps<"/purchase-orders/[poId]">) {
  const { poId } = await params;
  return <PoDetailView id={decodeURIComponent(poId)} />;
}
