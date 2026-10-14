import type { Metadata } from "next";
import { StocktakeDetailView } from "@/components/stocktakes/stocktake-detail-view";

export const metadata: Metadata = { title: "Stocktake" };

export default async function StocktakePage({ params }: PageProps<"/stocktakes/[stocktakeId]">) {
  const { stocktakeId } = await params;
  return <StocktakeDetailView id={decodeURIComponent(stocktakeId)} />;
}
