import type { Metadata } from "next";
import { PurchaseOrdersView } from "@/components/purchasing/purchase-orders-view";

export const metadata: Metadata = { title: "Purchase Orders" };

export default async function PurchaseOrdersPage({ searchParams }: PageProps<"/purchase-orders">) {
  const { status } = await searchParams;
  return <PurchaseOrdersView initialStatus={typeof status === "string" ? status : ""} />;
}
