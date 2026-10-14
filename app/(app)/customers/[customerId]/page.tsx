import type { Metadata } from "next";
import { CustomerDetailView } from "@/components/partners/customer-detail-view";

export const metadata: Metadata = { title: "Customer" };

export default async function CustomerPage({ params }: PageProps<"/customers/[customerId]">) {
  const { customerId } = await params;
  return <CustomerDetailView id={decodeURIComponent(customerId)} />;
}
