import type { Metadata } from "next";
import { SoFormView } from "@/components/sales/so-form";

export const metadata: Metadata = { title: "New sales order" };

export default async function NewSalesOrderPage({ searchParams }: PageProps<"/sales-orders/new">) {
  const { customer } = await searchParams;
  return <SoFormView customer={typeof customer === "string" ? customer : undefined} />;
}
