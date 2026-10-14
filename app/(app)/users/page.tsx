import type { Metadata } from "next";
import { UsersView } from "@/components/admin/users-view";

export const metadata: Metadata = { title: "Users & Permissions" };

export default function UsersPage() {
  return <UsersView />;
}
