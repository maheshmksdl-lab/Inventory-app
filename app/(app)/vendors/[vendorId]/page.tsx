import type { Metadata } from "next";
import { VendorDetailView } from "@/components/partners/vendor-detail-view";

export const metadata: Metadata = { title: "Vendor" };

export default async function VendorPage({ params }: PageProps<"/vendors/[vendorId]">) {
  const { vendorId } = await params;
  return <VendorDetailView id={decodeURIComponent(vendorId)} />;
}
