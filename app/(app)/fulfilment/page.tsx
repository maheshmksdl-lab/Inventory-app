import type { Metadata } from "next";
import { FulfilmentView } from "@/components/fulfilment/fulfilment-view";

export const metadata: Metadata = { title: "Pick, Pack & Ship" };

export default function FulfilmentPage() {
  return <FulfilmentView />;
}
