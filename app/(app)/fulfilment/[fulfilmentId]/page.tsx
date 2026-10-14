import type { Metadata } from "next";
import { FulfilmentDetailView } from "@/components/fulfilment/fulfilment-detail-view";

export const metadata: Metadata = { title: "Fulfilment" };

export default async function FulfilmentDetailPage({ params }: PageProps<"/fulfilment/[fulfilmentId]">) {
  const { fulfilmentId } = await params;
  return <FulfilmentDetailView id={decodeURIComponent(fulfilmentId)} />;
}
