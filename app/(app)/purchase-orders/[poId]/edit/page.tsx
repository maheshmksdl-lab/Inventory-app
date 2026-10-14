import type { Metadata } from "next";
import { PoFormView } from "@/components/purchasing/po-form";

export const metadata: Metadata = { title: "Edit purchase order" };

export default async function EditPurchaseOrderPage({ params }: PageProps<"/purchase-orders/[poId]/edit">) {
  const { poId } = await params;
  return <PoFormView editId={decodeURIComponent(poId)} />;
}
