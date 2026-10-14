import type { Metadata } from "next";
import { ReturnsView } from "@/components/sales/returns-view";

export const metadata: Metadata = { title: "Sales Returns" };

export default function SalesReturnsPage() {
  return <ReturnsView />;
}
