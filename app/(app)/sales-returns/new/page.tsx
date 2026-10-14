import type { Metadata } from "next";
import { ReturnFormView } from "@/components/sales/return-form";

export const metadata: Metadata = { title: "New return" };

export default async function NewReturnPage({ searchParams }: PageProps<"/sales-returns/new">) {
  const { so } = await searchParams;
  return <ReturnFormView soId={typeof so === "string" ? so : undefined} />;
}
