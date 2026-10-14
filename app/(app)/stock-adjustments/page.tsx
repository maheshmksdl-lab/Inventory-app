import type { Metadata } from "next";
import { AdjustmentsView } from "@/components/adjustments/adjustments-view";

export const metadata: Metadata = { title: "Stock Adjustments" };

export default async function AdjustmentsPage({ searchParams }: PageProps<"/stock-adjustments">) {
  // ?new=1 (from the dashboard's quick actions) opens the new-adjustment form.
  const { new: startNew } = await searchParams;
  return <AdjustmentsView startNew={startNew === "1"} />;
}
