import type { Metadata } from "next";
import { SupplierBillsView } from "@/components/purchasing/supplier-bills-view";

export const metadata: Metadata = { title: "Supplier Bills" };

export default function SupplierBillsPage() {
  return <SupplierBillsView />;
}
