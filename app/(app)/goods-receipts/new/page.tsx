import type { Metadata } from "next";
import { ReceiptFormView } from "@/components/purchasing/receipt-form";

export const metadata: Metadata = { title: "New goods receipt" };

export default async function NewReceiptPage({ searchParams }: PageProps<"/goods-receipts/new">) {
  const { po } = await searchParams;
  return <ReceiptFormView poId={typeof po === "string" ? po : undefined} />;
}
