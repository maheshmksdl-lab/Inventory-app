import type { Metadata } from "next";
import { TransferFormView } from "@/components/transfers/transfer-form";

export const metadata: Metadata = { title: "New transfer" };

export default function NewTransferPage() {
  return <TransferFormView />;
}
