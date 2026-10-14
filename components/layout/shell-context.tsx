"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useStoredState } from "@/hooks/use-stored-state";

/** Navigation drawer (phones / tablets) and collapsed rail (desktop), shared by the header and the sidebar. */
interface ShellState {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  collapsed: boolean;
  toggleCollapsed: () => void;
}

const ShellContext = createContext<ShellState | null>(null);

export function ShellProvider({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useStoredState("evoq-inventory:sidebar-collapsed", false);
  const value = useMemo(() => ({ drawerOpen, setDrawerOpen, collapsed, toggleCollapsed: () => setCollapsed(!collapsed) }), [drawerOpen, collapsed, setCollapsed]);
  return (
    <ShellContext.Provider value={value}>
      <div data-sidebar={collapsed ? "collapsed" : "expanded"} className="group/shell">
        {children}
      </div>
    </ShellContext.Provider>
  );
}

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used inside ShellProvider");
  return ctx;
}

/** Main content column, offset by the header and the desktop sidebar. */
export function ShellContent({ children }: { children: ReactNode }) {
  return (
    <div className="app-content flex min-h-dvh flex-col transition-[margin] duration-200">
      <main id="main" className="flex min-w-0 flex-1 flex-col">
        {children}
      </main>
    </div>
  );
}
