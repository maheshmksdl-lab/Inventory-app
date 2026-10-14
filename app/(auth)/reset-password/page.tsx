import type { Metadata } from "next";
import { ResetPasswordView } from "@/components/auth/reset-password-view";

export const metadata: Metadata = { title: "Reset password" };

export default function Page() {
  return <ResetPasswordView />;
}
