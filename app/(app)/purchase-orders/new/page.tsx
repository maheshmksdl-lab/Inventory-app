import type { Metadata } from "next";
import { PoFormView } from "@/components/purchasing/po-form";

export const metadata: Metadata = { title: "New purchase order" };

const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export default async function NewPurchaseOrderPage({ searchParams }: PageProps<"/purchase-orders/new">) {
  // ?vendor=…&warehouse=…&lines=productId:qty,… prefill a draft (used by Reorder Alerts).
  const sp = await searchParams;
  return <PoFormView prefill={{ vendor: str(sp.vendor), warehouse: str(sp.warehouse), lines: str(sp.lines) }} />;
}
