"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowsClockwiseIcon,
  ArrowsLeftRightIcon,
  CalendarBlankIcon,
  CaretDownIcon,
  CoinsIcon,
  CubeIcon,
  LightningIcon,
  PackageIcon,
  PlusIcon,
  ProhibitIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  SlidersHorizontalIcon,
  StackIcon,
  WarningIcon,
} from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, fieldClass, OutlineButton, PageHeading, PageShell } from "@/components/shared/inventory-ui";
import { KpiCard } from "@/components/shared/kpi-card";
import { ErrorState } from "@/components/shared/state-panels";
import { WarehouseSelect } from "@/components/shared/warehouse-select";
import { useDashboard, inventoryKeys } from "@/hooks/use-inventory";
import { useHydrated } from "@/hooks/use-hydrated";
import { useStoredState } from "@/hooks/use-stored-state";
import { useWarehouseScope } from "@/hooks/use-warehouse-scope";
import { formatCurrency, formatNumber, formatRange, pluralize } from "@/lib/format";
import { warehouseName } from "@/lib/mock-data/warehouses";
import { ITEMS_ROUTE, NEW_ITEM_ROUTE } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { LowStockAlerts, OrderOverview, RecentMovements, TopSelling, WarehouseOverview } from "./dashboard-panels";
import { InventoryTrend, type Granularity } from "./inventory-trend-chart";

const RANGES = [
  { days: 7, label: "Last 7 days" },
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 90 days" },
] as const;
type RangeDays = (typeof RANGES)[number]["days"];
const DEFAULT_RANGE: RangeDays = 7;

/** Create actions (documents are saved as demo records; none move stock). */
const CREATE = [
  { label: "Purchase Order", icon: ShoppingCartIcon, href: "/purchase-orders/new" },
  { label: "Stock Transfer", icon: ArrowsLeftRightIcon, href: "/stock-transfers/new" },
  { label: "Stock Adjustment", icon: SlidersHorizontalIcon, href: "/stock-adjustments?new=1" },
];

function QuickActions() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <OutlineButton icon={LightningIcon}>
          Quick Actions
          <CaretDownIcon size={13} aria-hidden className="text-ink-muted" />
        </OutlineButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 rounded-xl">
        <DropdownMenuItem asChild>
          <Link href={NEW_ITEM_ROUTE}>
            <PackageIcon aria-hidden /> Add Item
          </Link>
        </DropdownMenuItem>
        {CREATE.map(({ label, icon: IconCmp, href }) => (
          <DropdownMenuItem key={label} asChild>
            <Link href={href}>
              <IconCmp aria-hidden /> Create {label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NewMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-9 shrink-0 items-center rounded-lg bg-brand text-white shadow-[0_1px_2px_rgb(125_17_73/0.2)] transition-colors hover:bg-brand-press focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action">
        <span className="flex items-center gap-2 pr-3 pl-3.5 text-button">
          <PlusIcon size={16} weight="bold" aria-hidden />
          New
        </span>
        <span className="h-5 w-px bg-white/30" aria-hidden />
        <span className="px-2.5">
          <CaretDownIcon size={13} weight="bold" aria-hidden />
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl">
        <DropdownMenuLabel className="text-[12px] font-medium text-ink-muted">Create</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href={NEW_ITEM_ROUTE}>
            <PackageIcon aria-hidden /> Item
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {[...CREATE, { label: "Sales Order", icon: ShoppingBagIcon, href: "/sales-orders/new" }].map(({ label, icon: IconCmp, href }) => (
          <DropdownMenuItem key={label} asChild>
            <Link href={href}>
              <IconCmp aria-hidden /> {label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RangeSelect({ value, onChange }: { value: RangeDays; onChange: (d: RangeDays) => void }) {
  return (
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v) as RangeDays)}>
      <SelectTrigger aria-label="Date range" className={cn(fieldClass, "w-auto gap-2 font-medium text-ink")}>
        <CalendarBlankIcon size={16} aria-hidden className="text-ink-muted" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="end">
        {RANGES.map((r) => (
          <SelectItem key={r.days} value={String(r.days)}>
            {r.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function GranularityToggle({ value, onChange, weeklyDisabled }: { value: Granularity; onChange: (g: Granularity) => void; weeklyDisabled: boolean }) {
  return (
    <div className="flex gap-0.5 rounded-lg bg-[#F2F4F7] p-0.5" role="group" aria-label="Group by">
      {(["daily", "weekly"] as const).map((g) => {
        const disabled = g === "weekly" && weeklyDisabled;
        return (
          <button
            key={g}
            type="button"
            aria-pressed={value === g}
            disabled={disabled}
            title={disabled ? "Choose a 30- or 90-day range to group by week" : undefined}
            onClick={() => onChange(g)}
            className={cn(
              "h-7 rounded-md px-2.5 text-[12px] font-medium capitalize transition-colors focus-visible:outline-2 focus-visible:outline-brand-action disabled:cursor-not-allowed disabled:opacity-40",
              value === g ? "bg-white text-ink shadow-card" : "text-ink-muted hover:text-ink",
            )}
          >
            {g}
          </button>
        );
      })}
    </div>
  );
}

export function DashboardView() {
  const hydrated = useHydrated();
  const [scope] = useWarehouseScope();
  const [storedRange, setRange] = useStoredState<RangeDays>("evoq-inventory:dashboard-range", DEFAULT_RANGE);
  const days: RangeDays = RANGES.some((r) => r.days === storedRange) ? storedRange : DEFAULT_RANGE;
  const [granularityPref, setGranularity] = useState<Granularity>("daily");
  const granularity: Granularity = days === 7 ? "daily" : granularityPref;
  const qc = useQueryClient();
  const effectiveScope = hydrated ? scope : "all";
  const { data: fetched, isError, isFetching, refetch } = useDashboard(effectiveScope, days);
  const data = hydrated ? fetched : undefined;
  const loading = !data;
  // The server never fetches, so fetch state only counts after hydration (keeps SSR and first client render identical).
  const refreshing = hydrated && isFetching;

  const movementProducts = useMemo(() => new Map(Object.entries(data?.movementProducts ?? {})), [data]);
  const scopeLabel = effectiveScope === "all" ? "all warehouses" : warehouseName(effectiveScope);
  const rangeLabel = data ? formatRange(data.range.start, data.range.end) : "";

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: inventoryKeys.all });
    toast.success("Dashboard refreshed", { description: "Showing the latest sample data." });
  };

  const k = data?.kpis;

  return (
    <PageShell>
      <PageHeading
        crumbs={[{ label: "Overview" }, { label: "Dashboard" }]}
        title="Dashboard"
        description={
          <>
            <span className="font-medium text-ink-body">Welcome back, Admin.</span> Here&apos;s what&apos;s happening with your inventory today.
          </>
        }
        actions={
          <>
            <RangeSelect value={days} onChange={setRange} />
            <WarehouseSelect className="lg:hidden" />
            <OutlineButton onClick={refresh} disabled={refreshing} aria-label="Refresh dashboard" className="w-9 px-0">
              <ArrowsClockwiseIcon size={16} aria-hidden className={cn(refreshing && "animate-spin")} />
            </OutlineButton>
            <QuickActions />
            <NewMenu />
          </>
        }
      />

      {isError ? (
        <Card className="mt-5">
          <ErrorState hint="The dashboard couldn't be loaded." action={<OutlineButton onClick={() => refetch()}>Try again</OutlineButton>} />
        </Card>
      ) : (
        <>
          <p className="mt-4 text-[12.5px] text-ink-muted" aria-live="polite">
            {data ? (
              <>
                Showing <span className="font-medium text-ink-body">{scopeLabel}</span> · movements for <span className="font-medium text-ink-body">{rangeLabel}</span> · stock levels as of today
              </>
            ) : (
              " "
            )}
          </p>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:gap-4">
            <KpiCard icon={CubeIcon} label="Total Products" loading={loading} value={k && formatNumber(k.totalProducts)} note={k && `${formatNumber(k.activeProducts)} active`} href={ITEMS_ROUTE} />
            <KpiCard icon={StackIcon} label="Total Stock on Hand" loading={loading} value={k && formatNumber(k.stockOnHand)} note={k && `${formatNumber(k.reserved)} units reserved`} href={`${ITEMS_ROUTE}?sort=onHand&dir=desc`} />
            <KpiCard icon={CoinsIcon} label="Inventory Value" tone="coral" loading={loading} value={k && formatCurrency(k.inventoryValue)} note="On-hand stock at cost price" href={`${ITEMS_ROUTE}?sort=value&dir=desc`} />
            <KpiCard
              icon={WarningIcon}
              label="Low Stock Items"
              tone="coral"
              loading={loading}
              value={k && formatNumber(k.lowStock)}
              note={k && `${pluralize(k.lowStockLocations, "location")} need reorder`}
              href={`${ITEMS_ROUTE}?stock=low-stock`}
            />
            <KpiCard icon={ProhibitIcon} label="Out of Stock" loading={loading} value={k && formatNumber(k.outOfStock)} note="Active items, none available" href={`${ITEMS_ROUTE}?stock=out-of-stock`} />
            <KpiCard icon={ShoppingCartIcon} label="Pending Purchase Orders" tone="neutral" loading={loading} value={k && formatNumber(k.pendingPurchaseOrders)} note="Not yet received · sample data" />
            <KpiCard icon={ShoppingBagIcon} label="Open Sales Orders" tone="neutral" loading={loading} value={k && formatNumber(k.openSalesOrders)} note="Not yet fulfilled · sample data" />
            <KpiCard icon={ArrowsClockwiseIcon} label="Stock Movements" tone="neutral" loading={loading} value={k && formatNumber(k.movements)} note={RANGES.find((r) => r.days === days)?.label} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-12">
            <Card label="Inventory trend" className="flex flex-col 2xl:col-span-4">
              <CardHeader
                title="Inventory Trend"
                subtitle="Units received vs issued"
                action={<GranularityToggle value={granularity} onChange={setGranularity} weeklyDisabled={days === 7} />}
              />
              <InventoryTrend points={data?.trend} granularity={granularity} loading={loading} />
            </Card>
            <LowStockAlerts data={data} className="2xl:col-span-5" />
            <OrderOverview data={data} className="2xl:col-span-3" />
            <RecentMovements data={data} products={movementProducts} className="xl:order-5 xl:col-span-2 2xl:order-none 2xl:col-span-5" />
            <WarehouseOverview data={data} className="xl:order-6 xl:col-span-2 2xl:order-none 2xl:col-span-4" />
            <TopSelling data={data} className="xl:order-4 2xl:order-none 2xl:col-span-3" />
          </div>
        </>
      )}
    </PageShell>
  );
}
