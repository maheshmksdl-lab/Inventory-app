import type { Metadata } from "next";
import { SettingsView } from "@/components/admin/settings-view";

export const metadata: Metadata = { title: "Settings & Integrations" };

export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  const { tab } = await searchParams;
  // Keyed so a link to another ?tab= while already here switches section.
  return <SettingsView key={String(tab)} initialSection={typeof tab === "string" ? tab : undefined} />;
}
