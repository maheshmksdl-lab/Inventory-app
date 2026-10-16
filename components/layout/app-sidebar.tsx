"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CaretDoubleLeftIcon, CaretDoubleRightIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { AppLogo } from "./app-logo";
import { NAV_GROUPS, navFor, type NavItem } from "./nav-config";
import { useShell } from "./shell-context";

/** Wraps an item in a right-side tooltip on the collapsed rail. */
function SideTip({ show, label, children }: { show: boolean; label: string; children: ReactElement }) {
  if (!show) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function NavRow({ item, active, collapsed, onNavigate }: { item: NavItem; active: boolean; collapsed: boolean; onNavigate?: () => void }) {
  const IconCmp = item.icon;
  const cls = cn(
    "group relative flex items-center rounded-lg text-[13.5px] leading-5 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-action",
    collapsed ? "mx-auto size-9 justify-center" : "h-[34px] w-full gap-3 px-3",
    active
      ? cn("bg-brand-10 font-medium text-ink", !collapsed && "before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-r-full before:bg-brand")
      : "text-ink-body hover:bg-brand-depth-10 hover:text-ink",
  );
  const body = (
    <>
      <IconCmp size={18} weight={active ? "fill" : "regular"} aria-hidden className={cn("shrink-0", active ? "text-brand" : "text-ink-muted group-hover:text-ink")} />
      <span className={collapsed ? "sr-only" : "truncate"}>{item.label}</span>
    </>
  );

  return (
    <SideTip show={collapsed} label={item.label}>
      <Link href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={cls}>
        {body}
      </Link>
    </SideTip>
  );
}

function Nav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const current = navFor(pathname)?.item.href;
  return (
    <nav aria-label="Main navigation" className={cn("flex-1 overflow-x-hidden overflow-y-auto pb-3 scrollbar-thin", collapsed ? "px-2" : "px-3")}>
      {NAV_GROUPS.map((group, i) => (
        <div key={group.label} className={cn(i > 0 && (collapsed ? "mt-2 border-t border-line-soft pt-2" : "mt-4"))}>
          {!collapsed && <h2 className="mb-1 px-3 text-nav-group-label text-primary uppercase">{group.label}</h2>}
          <ul className="space-y-0.5" aria-label={collapsed ? group.label : undefined}>
            {group.items.map((item) => (
              <li key={item.href}>
                <NavRow item={item} active={item.href === current} collapsed={collapsed} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** Desktop: fixed full-height rail that collapses to icons. Phones / tablets: overlay drawer from the header's menu button. */
export function AppSidebar() {
  const { collapsed, toggleCollapsed, drawerOpen, setDrawerOpen } = useShell();
  const close = () => setDrawerOpen(false);

  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-line bg-sidebar transition-[width] duration-200 select-none lg:flex",
          collapsed ? "w-[var(--sidebar-w-collapsed)]" : "w-[var(--sidebar-w)]",
        )}
      >
        <div className={cn("flex h-[var(--header-h)] shrink-0 items-center", collapsed ? "justify-center" : "px-5")}>
          <AppLogo compact={collapsed} />
        </div>
        <Nav collapsed={collapsed} />
        <div className={cn("shrink-0 border-t border-line-soft py-2.5", collapsed ? "px-2" : "px-3")}>
          <SideTip show={collapsed} label="Expand sidebar">
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
              className={cn(
                "flex items-center rounded-lg text-[13.5px] text-ink-body transition-colors hover:bg-brand-depth-10 hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-action",
                collapsed ? "mx-auto size-9 justify-center" : "h-[34px] w-full gap-3 px-3",
              )}
            >
              {collapsed ? <CaretDoubleRightIcon size={16} aria-hidden /> : <CaretDoubleLeftIcon size={16} aria-hidden className="text-ink-muted" />}
              {!collapsed && "Collapse"}
            </button>
          </SideTip>
        </div>
      </aside>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" showCloseButton={false} className="w-[min(280px,85vw)] gap-0 border-none bg-sidebar p-0 shadow-[4px_0_24px_rgba(16,24,40,0.08)] lg:hidden">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">EVOQ Inventory modules</SheetDescription>
          <div className="flex h-[60px] shrink-0 items-center justify-between px-5">
            <AppLogo />
            <button
              type="button"
              onClick={close}
              aria-label="Close menu"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-ink transition-colors hover:bg-brand-depth-10 focus-visible:outline-2 focus-visible:outline-brand-action"
            >
              <XIcon size={18} weight="bold" aria-hidden />
            </button>
          </div>
          <Nav collapsed={false} onNavigate={close} />
        </SheetContent>
      </Sheet>
    </>
  );
}
