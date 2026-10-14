"use client";

import type { ReactNode } from "react";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";
import { ShellContent, ShellProvider } from "./shell-context";

/** The Inventory app frame (sidebar, header) around every page. */
export function AppChrome({ children }: { children: ReactNode }) {
  return (
    <ShellProvider>
      <AppSidebar />
      <AppHeader />
      <ShellContent>{children}</ShellContent>
    </ShellProvider>
  );
}
