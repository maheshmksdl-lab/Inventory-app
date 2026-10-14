import type { Metadata } from "next";
import { SalesOrdersView } from "@/components/sales/sales-orders-view";

export const metadata: Metadata = { title: "Sales Orders" };

export default async function SalesOrdersPage({ searchParams }: PageProps<"/sales-orders">) {
  const { status } = await searchParams;
  return <SalesOrdersView initialStatus={typeof status === "string" ? status : ""} />;
}
