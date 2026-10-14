import type { Metadata } from "next";
import { ValuationView } from "@/components/insights/valuation-view";

export const metadata: Metadata = { title: "Inventory Valuation" };

export default function InventoryValuationPage() {
  return <ValuationView />;
}
