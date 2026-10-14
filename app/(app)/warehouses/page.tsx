import type { Metadata } from "next";
import { WarehousesView } from "@/components/warehouses/warehouses-view";

export const metadata: Metadata = { title: "Warehouses & Locations" };

export default function WarehousesPage() {
  return <WarehousesView />;
}
