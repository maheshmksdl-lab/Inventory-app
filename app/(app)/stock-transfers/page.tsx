import type { Metadata } from "next";
import { TransfersView } from "@/components/transfers/transfers-view";

export const metadata: Metadata = { title: "Stock Transfers" };

export default function TransfersPage() {
  return <TransfersView />;
}
