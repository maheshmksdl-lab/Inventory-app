"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BellIcon,
  CaretDownIcon,
  GearSixIcon,
  InfoIcon,
  ListIcon,
  MagnifyingGlassIcon,
  QuestionIcon,
  SidebarSimpleIcon,
  SignOutIcon,
  UserCircleIcon,
  UsersThreeIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ProductThumb } from "@/components/shared/product-thumb";
import { WarehouseSelect } from "@/components/shared/warehouse-select";
import { useDashboard, useItemSearch } from "@/hooks/use-inventory";
import { useHydrated } from "@/hooks/use-hydrated";
import { useStoredState } from "@/hooks/use-stored-state";
import { warehouseName } from "@/lib/mock-data/warehouses";
import { ITEMS_ROUTE, itemHref } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { LogoMark } from "./app-logo";
import { navFor } from "./nav-config";
import { useShell } from "./shell-context";

const toolClass =
  "relative inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-body transition-colors hover:bg-brand-depth-10 hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-action data-[state=open]:bg-brand-depth-10";

/**
 * Header search over items (name, SKU, barcode). Suggestions open as you type;
 * Enter opens the Items list filtered by the text. `Ctrl/⌘ K` or `/` focuses it.
 */
function SearchField({ autoFocus, onDone, className }: { autoFocus?: boolean; onDone?: () => void; className?: string }) {
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const term = value.trim();
  const { data: results } = useItemSearch(term);
  const items = term ? (results ?? []) : [];

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName));
      if (((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") || (e.key === "/" && !typing)) {
        if (!ref.current || ref.current.offsetParent === null) return;
        e.preventDefault();
        ref.current.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const finish = () => {
    setOpen(false);
    setActiveIdx(-1);
    setValue("");
    ref.current?.blur();
    onDone?.();
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (activeIdx >= 0 && items[activeIdx]) router.push(itemHref(items[activeIdx].id));
    else router.push(term ? `${ITEMS_ROUTE}?q=${encodeURIComponent(term)}` : ITEMS_ROUTE);
    finish();
  };

  const showList = open && term.length > 0;

  return (
    <form role="search" onSubmit={submit} className={cn("relative", className)}>
      <MagnifyingGlassIcon size={17} aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-muted" />
      <input
        ref={ref}
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeIdx >= 0 ? `${listId}-${activeIdx}` : undefined}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
          setActiveIdx(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Escape") finish();
          if (e.key === "ArrowDown" && items.length) {
            e.preventDefault();
            setActiveIdx((i) => (i + 1) % items.length);
          }
          if (e.key === "ArrowUp" && items.length) {
            e.preventDefault();
            setActiveIdx((i) => (i <= 0 ? items.length - 1 : i - 1));
          }
        }}
        placeholder="Search items by name, SKU or barcode…"
        aria-label="Search items"
        aria-keyshortcuts="Control+K Meta+K"
        className="h-10 w-full rounded-lg border border-line bg-[#F9FAFB] pr-14 pl-10 text-[13px] text-ink outline-none placeholder:text-ink-muted transition-colors focus:border-brand-hover focus:bg-white focus:ring-3 focus:ring-brand-10 [&::-webkit-search-cancel-button]:hidden"
      />
      <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 items-center rounded border border-line bg-white px-1.5 font-sans text-[11px] leading-[18px] text-ink-muted sm:inline-flex" aria-hidden>
        ⌘K
      </kbd>
      {showList && (
        <div className="absolute inset-x-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-line bg-popover shadow-pop">
          <ul id={listId} role="listbox" aria-label="Matching items" className="max-h-80 overflow-y-auto py-1">
            {items.map((p, i) => (
              <li key={p.id} id={`${listId}-${i}`} role="option" aria-selected={i === activeIdx}>
                <Link
                  href={itemHref(p.id)}
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={finish}
                  className={cn("flex items-center gap-3 px-3 py-2 text-[13px] text-ink hover:bg-brand-surface", i === activeIdx && "bg-brand-surface")}
                >
                  <ProductThumb icon={p.icon} src={p.image} size={28} />
                  <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                  <span className="font-mono text-[12px] text-ink-muted">{p.sku}</span>
                </Link>
              </li>
            ))}
            {results && items.length === 0 && <li className="px-3 py-2.5 text-[13px] text-ink-muted">No items match “{term}”.</li>}
          </ul>
          <p className="border-t border-line-soft bg-[#FAFAFB] px-3 py-2 text-[12px] text-ink-muted">
            Press <kbd className="font-sans font-medium text-ink-body">Enter</kbd> to see all results in Items &amp; Products
          </p>
        </div>
      )}
    </form>
  );
}

const NO_IDS: string[] = [];

/** Low-stock alerts as notifications; each opens the item. */
function NotificationsMenu() {
  const { data } = useDashboard("all", 7);
  const hydrated = useHydrated();
  const [seen, setSeen] = useStoredState<string[]>("evoq-inventory:notifications-seen", NO_IDS);
  const list = (hydrated ? (data?.lowStock ?? []) : []).slice(0, 5).map((a) => ({
    id: `${a.productId}@${a.warehouseId}:${a.available}`,
    href: itemHref(a.productId),
    text: `${a.name} is ${a.status === "out-of-stock" ? "out of stock" : "below its reorder point"} at ${warehouseName(a.warehouseId)}`,
    detail: `${a.available} available · reorder point ${a.reorderPoint}`,
  }));
  const unread = list.filter((n) => !seen.includes(n.id)).length;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={unread ? `Notifications (${unread} unread)` : "Notifications"} className={toolClass}>
        <BellIcon size={20} aria-hidden />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-4 rounded-full bg-inventory-action px-1 text-[10px] leading-4 font-semibold text-white ring-2 ring-white tabular-nums" aria-hidden>
            {unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(340px,calc(100vw-24px))] rounded-xl p-0">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <DropdownMenuLabel className="p-0 text-[14px] font-semibold text-ink">Notifications</DropdownMenuLabel>
          <button
            type="button"
            disabled={!unread}
            onClick={() => setSeen(list.map((n) => n.id))}
            className="rounded text-[12px] font-medium text-brand hover:text-brand-press disabled:text-ink-faint focus-visible:outline-2 focus-visible:outline-brand-action"
          >
            Mark all as read
          </button>
        </div>
        <DropdownMenuSeparator className="my-0" />
        {list.length === 0 && <p className="px-4 py-6 text-center text-[13px] text-ink-muted">You&apos;re all caught up.</p>}
        {list.map((n) => {
          const isNew = !seen.includes(n.id);
          return (
            <DropdownMenuItem key={n.id} asChild className="rounded-none px-4 py-2.5">
              <Link href={n.href} onClick={() => isNew && setSeen([...seen, n.id])} className="flex items-start gap-2.5">
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", isNew ? "bg-brand" : "bg-transparent")} aria-label={isNew ? "Unread" : undefined} />
                <span className="flex flex-col gap-0.5">
                  <span className={cn("text-[13px] leading-5 text-ink", isNew && "font-medium")}>{n.text}</span>
                  <span className="text-[12px] leading-4 text-ink-muted">{n.detail}</span>
                </span>
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AccountMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu for Admin User"
        className="ml-1 inline-flex items-center gap-2 rounded-full p-0.5 transition-colors hover:bg-brand-depth-10 focus-visible:outline-2 focus-visible:outline-brand-action sm:rounded-lg sm:py-1 sm:pr-2 sm:pl-1"
      >
        <span className="inline-flex size-8 items-center justify-center rounded-full bg-inventory-tint text-[12px] font-semibold text-inventory-depth" aria-hidden>
          AU
        </span>
        <span className="hidden text-left xl:block">
          <span className="block text-[13px] leading-4 font-semibold text-ink">Admin User</span>
          <span className="block text-[11.5px] leading-4 text-ink-muted">Administrator</span>
        </span>
        <CaretDownIcon size={14} aria-hidden className="hidden text-ink-muted sm:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-xl">
        <DropdownMenuLabel className="px-2 py-1.5">
          <span className="block text-[14px] font-semibold text-ink">Admin User</span>
          <span className="block text-[12px] font-normal text-ink-muted">Administrator · Demo workspace</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings?tab=preferences">
            <UserCircleIcon aria-hidden /> My preferences
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/users">
            <UsersThreeIcon aria-hidden /> Users &amp; Permissions
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <GearSixIcon aria-hidden /> Settings &amp; Integrations
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          {/* No session exists in this prototype: this only opens the demo sign-in screen. */}
          <Link href="/login">
            <SignOutIcon aria-hidden /> Go to sign-in screen (demo)
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <p className="flex gap-2 px-2 py-1.5 text-[12px] leading-4 text-ink-muted">
          <InfoIcon size={14} aria-hidden className="mt-px shrink-0" />
          Frontend demo: data is sample data held in this browser tab and resets on reload. There is no real sign-in.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Help: shortcuts and what this prototype does and doesn't do. */
function HelpMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="Help" className={cn(toolClass, "hidden sm:inline-flex")}>
        <QuestionIcon size={20} aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 rounded-xl">
        <DropdownMenuLabel className="text-[14px] font-semibold text-ink">Help</DropdownMenuLabel>
        <div className="space-y-1.5 px-2 pb-2 text-[12.5px] text-ink-body">
          <p className="flex justify-between">
            Search items <kbd className="rounded border border-line px-1.5 font-sans text-[11px] text-ink-muted">Ctrl K</kbd>
          </p>
          <p className="flex justify-between">
            Focus search <kbd className="rounded border border-line px-1.5 font-sans text-[11px] text-ink-muted">/</kbd>
          </p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/reports">Reports &amp; Analytics</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/stock-movements">Stock Movement History</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <p className="px-2 py-1.5 text-[12px] leading-4 text-ink-muted">
          This is a frontend prototype. Orders, receipts, transfers and adjustments are saved as demo records only — stock balances never change and nothing is sent anywhere.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppHeader() {
  const { setDrawerOpen, toggleCollapsed, collapsed } = useShell();
  const [mobileSearch, setMobileSearch] = useState(false);
  const pathname = usePathname();
  const nav = navFor(pathname);

  return (
    <header className="fixed top-0 right-0 left-0 z-30 flex h-[60px] items-center gap-2 border-b border-line bg-white px-3 sm:gap-3 sm:px-5 lg:left-[var(--sidebar-w)] lg:h-[var(--header-h)] lg:px-6 lg:transition-[left] lg:duration-200 lg:group-data-[sidebar=collapsed]/shell:left-[var(--sidebar-w-collapsed)]">
      {/* Phones / tablets: the menu button opens the navigation drawer */}
      <button type="button" onClick={() => setDrawerOpen(true)} aria-label="Open menu" className={cn(toolClass, "lg:hidden")}>
        <ListIcon size={20} weight="bold" aria-hidden />
      </button>
      {/* Desktop: collapse / expand the sidebar */}
      <button type="button" onClick={toggleCollapsed} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} className={cn(toolClass, "hidden lg:inline-flex")}>
        <SidebarSimpleIcon size={20} aria-hidden />
      </button>
      <LogoMark className="size-8 sm:hidden" />

      {nav && (
        // The page title keeps its width; the search box takes what is left (up to 460px).
        <div className="hidden min-w-0 shrink items-baseline gap-2 sm:flex">
          <span className="max-w-[240px] truncate text-[15px] leading-6 font-semibold whitespace-nowrap text-ink">{nav.item.label}</span>
          <span className="hidden shrink-0 text-[13px] whitespace-nowrap text-ink-muted 2xl:inline">/ {nav.group.label}</span>
        </div>
      )}

      <SearchField className="mx-auto hidden w-full max-w-[460px] min-w-[200px] flex-1 basis-0 md:block" />
      <div className="flex-1 md:hidden" />

      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
        <button type="button" onClick={() => setMobileSearch(true)} aria-label="Search" className={cn(toolClass, "md:hidden")}>
          <MagnifyingGlassIcon size={20} aria-hidden />
        </button>
        <WarehouseSelect className="hidden h-10 lg:flex" />
        <NotificationsMenu />
        <HelpMenu />
        <AccountMenu />
      </div>

      {/* Phones: search opens as a bar over the header */}
      {mobileSearch && (
        <div className="absolute inset-0 flex items-center gap-2 bg-white px-3 md:hidden">
          <SearchField autoFocus onDone={() => setMobileSearch(false)} className="flex-1" />
          <button type="button" onClick={() => setMobileSearch(false)} aria-label="Close search" className={toolClass}>
            <XIcon size={18} aria-hidden />
          </button>
        </div>
      )}
    </header>
  );
}
