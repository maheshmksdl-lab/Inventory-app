import type { Metadata } from "next";
import { WarehouseDetailView } from "@/components/warehouses/warehouse-detail-view";

export const metadata: Metadata = { title: "Warehouse" };

export default async function WarehousePage({ params }: PageProps<"/warehouses/[warehouseId]">) {
  const { warehouseId } = await params;
  return <WarehouseDetailView id={decodeURIComponent(warehouseId)} />;
}
