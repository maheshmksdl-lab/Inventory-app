import type { Metadata } from "next";
import { SoDetailView } from "@/components/sales/so-detail-view";

export const metadata: Metadata = { title: "Sales order" };

export default async function SalesOrderPage({ params }: PageProps<"/sales-orders/[soId]">) {
  const { soId } = await params;
  return <SoDetailView id={decodeURIComponent(soId)} />;
}
