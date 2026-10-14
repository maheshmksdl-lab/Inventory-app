import type { Metadata } from "next";
import { BillDetailView } from "@/components/purchasing/bill-detail-view";

export const metadata: Metadata = { title: "Supplier bill" };

export default async function BillPage({ params }: PageProps<"/supplier-bills/[billId]">) {
  const { billId } = await params;
  return <BillDetailView id={decodeURIComponent(billId)} />;
}
