import type { Metadata } from "next";
import { CatalogView } from "@/components/catalog/catalog-view";

export const metadata: Metadata = { title: "Categories & Brands" };

export default async function CategoriesPage({ searchParams }: PageProps<"/categories">) {
  const { tab } = await searchParams;
  return <CatalogView key={String(tab)} initialTab={typeof tab === "string" ? tab : undefined} />;
}
