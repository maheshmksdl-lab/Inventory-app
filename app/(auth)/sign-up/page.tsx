import type { Metadata } from "next";
import { SignUpView } from "@/components/auth/sign-up-view";

export const metadata: Metadata = { title: "Create account" };

export default function Page() {
  return <SignUpView />;
}
