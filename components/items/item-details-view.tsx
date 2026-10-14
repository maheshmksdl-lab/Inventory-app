"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArchiveIcon,
  ArrowCounterClockwiseIcon,
  ArrowLeftIcon,
  ArrowsClockwiseIcon,
  CheckCircleIcon,
  CopyIcon,
  DotsThreeIcon,
  FlagIcon,
  LockSimpleIcon,
  PackageIcon,
  PencilSimpleIcon,
  PlusCircleIcon,
  StackIcon,
  StarIcon,
  StorefrontIcon,
  TagIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge, Card, CardHeader, FilterSelect, OutlineButton, PageShell, Pagination, PrimaryButton, StatusBadge, td, th, UnderlineTabs, Breadcrumbs } from "@/components/shared/inventory-ui";
import { KpiCard } from "@/components/shared/kpi-card";
import { MovementTable } from "@/components/shared/movement-table";
import { ProductThumb } from "@/components/shared/product-thumb";
import { EmptyState, ErrorState } from "@/components/shared/state-panels";
import { useItem, useItemMovements } from "@/hooks/use-inventory";
import { useHydrated } from "@/hooks/use-hydrated";
import type { ItemDetail } from "@/lib/api/inventory";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";
import { ITEM_TYPE_LABEL, LIFECYCLE_LABEL, MOVEMENT_META, STATUS_META } from "@/lib/inventory-meta";
import { vendorName, warehouseName, WAREHOUSES } from "@/lib/mock-data/warehouses";
import { getItemsListHref, itemEditHref } from "@/lib/routes";
import type { ActivityKind, MovementType } from "@/lib/types/inventory";
import { cn } from "@/lib/utils";
import { useArchiveFlow } from "./item-actions";

export const ITEM_TABS = ["overview", "stock", "transactions", "suppliers", "activity"] as const;
export type ItemTab = (typeof ITEM_TABS)[number];
const TAB_LABEL: Record<ItemTab, string> = {
  overview: "Overview",
  stock: "Stock by Warehouse",
  transactions: "Transactions",
  suppliers: "Suppliers",
  activity: "Activity",
};

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`, { description: text });
  } catch {
    toast.error(`Couldn't copy the ${label.toLowerCase()}`);
  }
}

// ── Overview ─────────────────────────────────────────────────────────

function Detail({ label, children, mono }: { label: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] leading-4 text-ink-muted">{label}</dt>
      <dd className={cn("mt-1 text-[13.5px] leading-5 break-words text-ink", mono && "font-mono text-[13px]")}>{children}</dd>
    </div>
  );
}

function OverviewTab({ d }: { d: ItemDetail }) {
  const p = d.item;
  const margin = p.sellingPrice > 0 ? ((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100 : 0;
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <Card>
        <CardHeader title="Description" />
        <p className="px-5 pb-5 text-[13.5px] leading-[22px] whitespace-pre-line text-ink-body">{p.description || <span className="text-ink-muted">No description yet.</span>}</p>
      </Card>
      <Card>
        <CardHeader title="Item details" />
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="SKU" mono>
            {p.sku}
          </Detail>
          <Detail label="Barcode" mono>
            {p.barcode || "—"}
          </Detail>
          <Detail label="Item type">{ITEM_TYPE_LABEL[p.type]}</Detail>
          <Detail label="Category">{p.category}</Detail>
          <Detail label="Brand">{p.brand}</Detail>
          <Detail label="Unit of measurement">{p.unit}</Detail>
          <Detail label="Cost price">{formatCurrency(p.costPrice, { decimals: true })}</Detail>
          <Detail label="Selling price">{formatCurrency(p.sellingPrice, { decimals: true })}</Detail>
          <Detail label="Margin">{p.sellingPrice > 0 ? `${margin.toFixed(1)}%` : "—"}</Detail>
          <Detail label="Tax classification">{p.taxClass}</Detail>
          <Detail label="Reorder point">{formatNumber(p.reorderPoint)} {p.unit}</Detail>
          <Detail label="Product status">{LIFECYCLE_LABEL[p.lifecycle]}</Detail>
          <Detail label="Stock value (at cost)">{formatCurrency(p.stockValue)}</Detail>
          <Detail label="Created">{formatDateTime(p.createdAt)}</Detail>
          <Detail label="Last updated">{formatDateTime(p.updatedAt)}</Detail>
        </dl>
      </Card>
    </div>
  );
}

// ── Stock by warehouse ───────────────────────────────────────────────

function StockTab({ d }: { d: ItemDetail }) {
  const t = d.warehouses.reduce((s, w) => ({ onHand: s.onHand + w.onHand, reserved: s.reserved + w.reserved, available: s.available + w.available, reorderPoint: s.reorderPoint + w.reorderPoint }), {
    onHand: 0,
    reserved: 0,
    available: 0,
    reorderPoint: 0,
  });
  const inactive = d.item.lifecycle !== "active";
  return (
    <Card>
      <CardHeader title="Stock by Warehouse" subtitle="Available = On hand − Reserved" />
      <div className="relative overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[640px] border-collapse">
          <caption className="sr-only">Stock of {d.item.name} by warehouse</caption>
          <thead>
            <tr className="border-y border-line-soft bg-[#FAFAFB]">
              <th scope="col" className={th}>
                Warehouse
              </th>
              <th scope="col" className={cn(th, "text-right")}>
                On hand
              </th>
              <th scope="col" className={cn(th, "text-right")}>
                Reserved
              </th>
              <th scope="col" className={cn(th, "text-right")}>
                Available
              </th>
              <th scope="col" className={cn(th, "text-right")}>
                Reorder point
              </th>
              <th scope="col" className={th}>
                Stock status
              </th>
            </tr>
          </thead>
          <tbody>
            {d.warehouses.map((w) => (
              <tr key={w.warehouseId} className="border-b border-line-soft">
                <th scope="row" className={cn(td, "text-left font-normal")}>
                  <span className="block font-medium text-ink">{warehouseName(w.warehouseId)}</span>
                  <span className="block text-[12px] leading-4 text-ink-muted">{WAREHOUSES.find((x) => x.id === w.warehouseId)?.city}</span>
                </th>
                <td className={cn(td, "text-right tabular-nums")}>{formatNumber(w.onHand)}</td>
                <td className={cn(td, "text-right tabular-nums")}>{formatNumber(w.reserved)}</td>
                <td className={cn(td, "text-right font-semibold text-ink tabular-nums")}>{formatNumber(w.available)}</td>
                <td className={cn(td, "text-right tabular-nums")}>{formatNumber(w.reorderPoint)}</td>
                <td className={td}>{inactive ? <span className="text-[12.5px] text-ink-muted">Not tracked ({LIFECYCLE_LABEL[d.item.lifecycle].toLowerCase()})</span> : <StatusBadge status={w.status} />}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#FAFAFB]">
              <th scope="row" className={cn(td, "text-left font-semibold text-ink")}>
                All warehouses
              </th>
              <td className={cn(td, "text-right font-semibold text-ink tabular-nums")}>{formatNumber(t.onHand)}</td>
              <td className={cn(td, "text-right font-semibold text-ink tabular-nums")}>{formatNumber(t.reserved)}</td>
              <td className={cn(td, "text-right font-semibold text-ink tabular-nums")}>{formatNumber(t.available)}</td>
              <td className={cn(td, "text-right text-ink-body tabular-nums")} title="Sum of warehouse reorder points">
                {formatNumber(t.reorderPoint)}
              </td>
              <td className={td}>{inactive ? null : <StatusBadge status={d.item.stockStatus} />}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="px-5 pt-2 pb-4 text-[12px] leading-4 text-ink-muted">
        Overall status compares total available stock with the item-level reorder point ({formatNumber(d.item.reorderPoint)}).
      </p>
    </Card>
  );
}

// ── Transactions ─────────────────────────────────────────────────────

const TX_PAGE = 10;

function TransactionsTab({ id }: { id: string }) {
  const { data, isError, refetch } = useItemMovements(id);
  const [type, setType] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [page, setPage] = useState(1);
  const rows = useMemo(() => (data ?? []).filter((m) => (!type || m.type === type) && (!warehouse || m.from === warehouse || m.to === warehouse)), [data, type, warehouse]);
  const pageCount = Math.max(1, Math.ceil(rows.length / TX_PAGE));
  const current = Math.min(page, pageCount);

  return (
    <Card>
      <CardHeader title="Transactions" subtitle="Stock movements for this item · sample ledger" />
      <div className="grid grid-cols-1 gap-2 px-5 pb-3 sm:flex">
        <FilterSelect
          label="Transaction type"
          allLabel="All transaction types"
          value={type}
          onChange={(v) => {
            setType(v);
            setPage(1);
          }}
          options={(Object.keys(MOVEMENT_META) as MovementType[]).map((k) => ({ value: k, label: MOVEMENT_META[k].label }))}
          className="sm:w-[210px]"
        />
        <FilterSelect
          label="Warehouse"
          allLabel="All warehouses"
          value={warehouse}
          onChange={(v) => {
            setWarehouse(v);
            setPage(1);
          }}
          options={WAREHOUSES.map((w) => ({ value: w.id, label: w.name }))}
          className="sm:w-[190px]"
        />
      </div>
      {isError ? (
        <ErrorState action={<OutlineButton onClick={() => refetch()}>Try again</OutlineButton>} />
      ) : !data ? (
        <div className="space-y-3 px-5 pb-5">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ArrowsClockwiseIcon}
          title={data.length === 0 ? "No transactions yet" : "No transactions match"}
          hint={data.length === 0 ? "Stock movements appear here once the item is received, issued, transferred or adjusted." : "Try another type or warehouse."}
        />
      ) : (
        <>
          <MovementTable rows={rows.slice((current - 1) * TX_PAGE, current * TX_PAGE)} caption="Item transactions" />
          <div className="border-t border-line-soft px-5 py-3">
            <Pagination page={current} pageCount={pageCount} total={rows.length} pageSize={TX_PAGE} noun="transactions" onPage={setPage} />
          </div>
        </>
      )}
    </Card>
  );
}

// ── Suppliers ────────────────────────────────────────────────────────

function SuppliersTab({ d }: { d: ItemDetail }) {
  const list = d.item.suppliers;
  return (
    <Card>
      <CardHeader title="Suppliers" subtitle="Vendors this item is bought from" />
      {list.length === 0 ? (
        <EmptyState icon={StorefrontIcon} title="No suppliers linked" hint="Vendors list the items they supply on their Products tab." />
      ) : (
        <div className="relative overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[560px] border-collapse">
            <caption className="sr-only">Suppliers of {d.item.name}</caption>
            <thead>
              <tr className="border-y border-line-soft bg-[#FAFAFB]">
                <th scope="col" className={th}>
                  Supplier
                </th>
                <th scope="col" className={th}>
                  Supplier SKU
                </th>
                <th scope="col" className={cn(th, "text-right")}>
                  Last purchase cost
                </th>
                <th scope="col" className={th}>
                  Preferred
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.vendorId} className="border-b border-line-soft last:border-0">
                  <td className={cn(td, "font-medium text-ink")}>{vendorName(s.vendorId)}</td>
                  <td className={cn(td, "font-mono text-[12px]")}>{s.supplierSku}</td>
                  <td className={cn(td, "text-right tabular-nums")}>{formatCurrency(s.lastCost, { decimals: true })}</td>
                  <td className={td}>
                    {s.preferred ? (
                      <Badge fg="var(--inventory-depth)" bg="var(--inventory-surface)">
                        <StarIcon size={12} weight="fill" aria-hidden /> Preferred
                      </Badge>
                    ) : (
                      <span className="text-ink-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ── Activity ─────────────────────────────────────────────────────────

const ACTIVITY_ICON: Record<ActivityKind, Icon> = {
  created: PlusCircleIcon,
  updated: PencilSimpleIcon,
  price: TagIcon,
  archived: ArchiveIcon,
  restored: ArrowCounterClockwiseIcon,
  status: FlagIcon,
};

function ActivityTab({ d }: { d: ItemDetail }) {
  return (
    <Card>
      <CardHeader title="Activity" subtitle="Changes to this item, newest first" />
      <ol className="px-5 pb-5">
        {d.item.activity.map((a, i) => {
          const IconCmp = ACTIVITY_ICON[a.kind];
          const last = i === d.item.activity.length - 1;
          return (
            <li key={a.id} className="relative flex gap-3 pb-5 last:pb-0">
              {!last && <span className="absolute top-8 bottom-0 left-[15px] w-px bg-line" aria-hidden />}
              <span className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-white text-ink-muted" aria-hidden>
                <IconCmp size={15} />
              </span>
              <div className="min-w-0 pt-1">
                <p className="text-[13.5px] leading-5 text-ink">{a.text}</p>
                <p className="mt-0.5 text-[12px] leading-4 text-ink-muted">
                  {a.user} · {formatDateTime(a.at)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading item">
      <div className="mt-4 flex items-center gap-4">
        <Skeleton className="size-16 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[88px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="mt-6 h-64 rounded-xl" />
    </div>
  );
}

export function ItemDetailsView({ id, initialTab }: { id: string; initialTab?: string }) {
  const hydrated = useHydrated();
  const { data: fetched, isError, error, refetch } = useItem(id);
  const data = hydrated ? fetched : undefined;
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTabState] = useState<ItemTab>((ITEM_TABS as readonly string[]).includes(initialTab ?? "") ? (initialTab as ItemTab) : "overview");
  const archive = useArchiveFlow();
  const listHref = getItemsListHref();

  const setTab = useCallback(
    (t: ItemTab) => {
      setTabState(t);
      router.replace(t === "overview" ? pathname : `${pathname}?tab=${t}`, { scroll: false });
    },
    [router, pathname],
  );

  const crumbs = [{ label: "Inventory" }, { label: "Items & Products", href: listHref }, { label: data?.item.name ?? "Item" }];

  if (isError) {
    const missing = error?.message === "Item not found";
    return (
      <PageShell>
        <Breadcrumbs items={crumbs.slice(0, 2).concat({ label: missing ? "Not found" : "Error" })} />
        <Card className="mt-4">
          {missing ? (
            <EmptyState
              icon={PackageIcon}
              title="This item doesn't exist"
              hint="It may have been created in an earlier session — demo data resets when the page reloads."
              action={
                <Link href={listHref} className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-white px-3.5 text-button-sm text-ink-body hover:bg-[#F9FAFB]">
                  <ArrowLeftIcon size={15} aria-hidden /> Back to Items
                </Link>
              }
            />
          ) : (
            <ErrorState action={<OutlineButton onClick={() => refetch()}>Try again</OutlineButton>} />
          )}
        </Card>
      </PageShell>
    );
  }

  const p = data?.item;
  const archived = p?.lifecycle === "archived";

  return (
    <PageShell>
      <Breadcrumbs items={crumbs} />
      {!p || !data ? (
        <DetailSkeleton />
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-start gap-x-4 gap-y-4">
            <ProductThumb icon={p.icon} size={64} className="rounded-xl" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <h1 className="min-w-0 text-[22px] leading-8 font-semibold tracking-[-0.01em] break-words text-ink sm:text-[24px]">{p.name}</h1>
                <StatusBadge status={p.status} />
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] leading-5 text-ink-muted">
                <span className="font-mono text-ink-body">{p.sku}</span>
                <span aria-hidden>·</span>
                <span>{p.category}</span>
                <span aria-hidden>·</span>
                <span>{p.brand}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={listHref}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-white px-3.5 text-button-sm text-ink-body transition-colors hover:border-[#D0D5DD] hover:bg-[#F9FAFB] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action"
              >
                <ArrowLeftIcon size={15} aria-hidden /> Back to Items
              </Link>
              {!archived && (
                <PrimaryButton icon={PencilSimpleIcon} onClick={() => router.push(itemEditHref(p.id))}>
                  Edit Item
                </PrimaryButton>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <OutlineButton aria-label="More actions" className="w-9 px-0">
                    <DotsThreeIcon size={18} weight="bold" aria-hidden />
                  </OutlineButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-xl">
                  <DropdownMenuItem onSelect={() => copy(p.sku, "SKU")}>
                    <CopyIcon aria-hidden /> Copy SKU
                  </DropdownMenuItem>
                  {p.barcode && (
                    <DropdownMenuItem onSelect={() => copy(p.barcode, "Barcode")}>
                      <CopyIcon aria-hidden /> Copy barcode
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {archived ? (
                    <DropdownMenuItem onSelect={() => archive.restore([p.id], p.name)}>
                      <ArrowCounterClockwiseIcon aria-hidden /> Restore item
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem variant="destructive" onSelect={() => archive.ask([p.id], p.name)}>
                      <ArchiveIcon aria-hidden /> Archive item
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {archived && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-[#F9FAFB] px-4 py-3 text-[13px] text-ink-body" role="status">
              <LockSimpleIcon size={17} aria-hidden className="text-ink-muted" />
              <span className="flex-1">This item is archived. It&apos;s hidden from lists and totals, and can&apos;t be edited until it&apos;s restored.</span>
              <OutlineButton icon={ArrowCounterClockwiseIcon} className="h-8" onClick={() => archive.restore([p.id], p.name)} disabled={archive.pending}>
                Restore
              </OutlineButton>
            </div>
          )}

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard icon={StackIcon} tone="neutral" label="Stock on Hand" value={`${formatNumber(p.onHand)} ${p.unit}`} note={`Across ${WAREHOUSES.length} warehouses`} />
            <KpiCard icon={LockSimpleIcon} tone="neutral" label="Reserved" value={formatNumber(p.reserved)} note="Allocated to open orders" />
            <KpiCard icon={CheckCircleIcon} tone="brand" label="Available" value={formatNumber(p.available)} note={p.lifecycle === "active" ? STATUS_META[p.stockStatus].label : LIFECYCLE_LABEL[p.lifecycle]} />
            <KpiCard icon={FlagIcon} tone="coral" label="Reorder Point" value={formatNumber(p.reorderPoint)} note="Item-level threshold" />
          </div>

          <UnderlineTabs label="Item information" idPrefix="item" className="mt-6" value={tab} onChange={setTab} tabs={ITEM_TABS.map((t) => ({ value: t, label: TAB_LABEL[t] }))} />
          <div role="tabpanel" id={`item-panel-${tab}`} aria-labelledby={`item-tab-${tab}`} className="mt-4" tabIndex={-1}>
            {tab === "overview" && <OverviewTab d={data} />}
            {tab === "stock" && <StockTab d={data} />}
            {tab === "transactions" && <TransactionsTab id={p.id} />}
            {tab === "suppliers" && <SuppliersTab d={data} />}
            {tab === "activity" && <ActivityTab d={data} />}
          </div>
        </>
      )}
      {archive.dialog()}
    </PageShell>
  );
}
