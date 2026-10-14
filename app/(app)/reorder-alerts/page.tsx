import type { Metadata } from "next";
import { ReorderAlertsView } from "@/components/insights/reorder-alerts-view";

export const metadata: Metadata = { title: "Reorder Alerts" };

export default async function ReorderAlertsPage({ searchParams }: PageProps<"/reorder-alerts">) {
  // ?q=SKU (from the dashboard's Reorder buttons) prefills the search.
  const { q } = await searchParams;
  return <ReorderAlertsView key={String(q)} initialQuery={typeof q === "string" ? q : ""} />;
}
