import type { Metadata } from "next";
import { BarcodesView } from "@/components/barcodes/barcodes-view";

export const metadata: Metadata = { title: "Barcode & QR Codes" };

export default function BarcodesPage() {
  return <BarcodesView />;
}
