import type { Metadata } from "next";
import { SoFormView } from "@/components/sales/so-form";

export const metadata: Metadata = { title: "Edit sales order" };

export default async function EditSalesOrderPage({ params }: PageProps<"/sales-orders/[soId]/edit">) {
  const { soId } = await params;
  return <SoFormView editId={decodeURIComponent(soId)} />;
}
