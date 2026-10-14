import type { Metadata } from "next";
import { StocktakesView } from "@/components/stocktakes/stocktakes-view";

export const metadata: Metadata = { title: "Stocktakes" };

export default function StocktakesPage() {
  return <StocktakesView />;
}
