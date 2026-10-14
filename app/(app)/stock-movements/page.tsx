import type { Metadata } from "next";
import { MovementsView } from "@/components/insights/movements-view";

export const metadata: Metadata = { title: "Stock Movement History" };

export default async function StockMovementsPage({ searchParams }: PageProps<"/stock-movements">) {
  const { q } = await searchParams;
  return <MovementsView initialQuery={typeof q === "string" ? q : ""} />;
}
