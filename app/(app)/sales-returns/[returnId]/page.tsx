import type { Metadata } from "next";
import { ReturnDetailView } from "@/components/sales/return-detail-view";

export const metadata: Metadata = { title: "Sales return" };

export default async function ReturnPage({ params }: PageProps<"/sales-returns/[returnId]">) {
  const { returnId } = await params;
  return <ReturnDetailView id={decodeURIComponent(returnId)} />;
}
