"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useHydrated } from "@/hooks/use-hydrated";
import { LOGIN_ROUTE } from "@/lib/routes";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";
import { useSignedOut } from "./session";
import { ShellContent, ShellProvider } from "./shell-context";

/** The Inventory app frame (sidebar, header) around every page. */
export function AppChrome({ children }: { children: ReactNode }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [signedOut] = useSignedOut();
  const guarded = hydrated && signedOut;

  // After Log out, every workspace page sends this tab back to the Login page.
  useEffect(() => {
    if (guarded) router.replace(LOGIN_ROUTE);
  }, [guarded, router]);

  if (guarded) return null;

  return (
    <ShellProvider>
      <AppSidebar />
      <AppHeader />
      <ShellContent>{children}</ShellContent>
    </ShellProvider>
  );
}
