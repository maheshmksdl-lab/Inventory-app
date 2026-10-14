"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArchiveIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowsDownUpIcon,
  CheckCircleIcon,
  CubeIcon,
  DownloadSimpleIcon,
  PackageIcon,
  PlusIcon,
  ProhibitIcon,
  UploadSimpleIcon,
  WarningIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, FilterSelect, OutlineButton, PageHeading, PageShell, Pagination, PrimaryButton, SearchInput, StatusBadge, td, th, UnavailableTip } from "@/components/shared/inventory-ui";
import { ProductThumb } from "@/components/shared/product-thumb";
import { EmptyState, ErrorState } from "@/components/shared/state-panels";
import { WarehouseSelect } from "@/components/shared/warehouse-select";
import { useItems, useLookups } from "@/hooks/use-inventory";
import { useHydrated } from "@/hooks/use-hydrated";
import { useWarehouseScope } from "@/hooks/use-warehouse-scope";
import { getItemsByIds } from "@/lib/api/inventory";
import { downloadCsv } from "@/lib/csv";
import { formatCurrency, formatNumber, pluralize, toIsoDate } from "@/lib/format";
import { ITEM_TYPE_LABEL, LIFECYCLE_LABEL, STATUS_META } from "@/lib/inventory-meta";
import { warehouseName } from "@/lib/mock-data/warehouses";
import { ITEMS_ROUTE, itemHref, NEW_ITEM_ROUTE, setItemsListHref } from "@/lib/routes";
import { DEFAULT_ITEM_QUERY, itemQueryString, PAGE_SIZES, parseItemQuery, type ItemQuery, type ItemSort } from "@/lib/schemas/item";
import type { ProductRow, WarehouseScope } from "@/lib/types/inventory";
import { cn } from "@/lib/utils";
import { ItemRowMenu, useArchiveFlow } from "./item-actions";

/** List state lives in the URL, so filters survive refresh, Back, and links from the dashboard. */
function useItemQuery() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const query = useMemo(() => parseItemQuery(new URLSearchParams(params.toString())), [params]);
  const update = useCallback(
    (patch: Partial<ItemQuery>) => {
      // Any change other than paging returns to page 1.
      const next = { ...query, ...patch, page: patch.page ?? 1 };
      router.replace(`${pathname}${itemQueryString(next)}`, { scroll: false });
    },
    [query, router, pathname],
  );
  return [query, update] as const;
}

const hasFilters = (q: ItemQuery) => !!(q.q || q.category || q.brand || q.stock || q.type || q.lifecycle);

// ── Header & summary ─────────────────────────────────────────────────

function exportRows(rows: ProductRow[], scope: WarehouseScope) {
  downloadCsv(
    `evoq-inventory-items-${toIsoDate(new Date())}.csv`,
    ["Name", "SKU", "Barcode", "Category", "Brand", "Type", "Unit", "Warehouse", "On hand", "Reserved", "Available", "Reorder point", "Cost price", "Selling price", "Status"],
    rows.map((r) => [
      r.name,
      r.sku,
      r.barcode,
      r.category,
      r.brand,
      ITEM_TYPE_LABEL[r.type],
      r.unit,
      scope === "all" ? "All warehouses" : warehouseName(scope),
      r.onHand,
      r.reserved,
      r.available,
      r.scopeReorderPoint,
      r.costPrice,
      r.sellingPrice,
      STATUS_META[r.status].label,
    ]),
  );
}

function SummaryTile({ icon: IconCmp, label, value, active, onClick, tone }: { icon: Icon; label: string; value: number | undefined; active: boolean; onClick: () => void; tone: "brand" | "coral" | "neutral" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex min-w-0 items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left shadow-card transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action",
        active ? "border-brand-soft bg-brand-surface" : "border-line hover:border-[#D0D5DD]",
      )}
    >
      <span
        className={cn(
          "inline-flex size-9 shrink-0 items-center justify-center rounded-full",
          tone === "brand" ? "bg-inventory-surface text-inventory" : tone === "coral" ? "bg-coral-10 text-[#D9443F]" : "bg-[#F2F4F7] text-[#475467]",
        )}
        aria-hidden
      >
        <IconCmp size={18} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[12.5px] leading-4 text-ink-muted">{label}</span>
        {value === undefined ? <Skeleton className="mt-1 h-5 w-10" /> : <span className="block text-[20px] leading-7 font-semibold text-ink tabular-nums">{formatNumber(value)}</span>}
      </span>
    </button>
  );
}

// ── Toolbar ──────────────────────────────────────────────────────────

const STOCK_OPTIONS = (["in-stock", "low-stock", "out-of-stock"] as const).map((v) => ({ value: v, label: STATUS_META[v].label }));
const TYPE_OPTIONS = (["stocked", "consumable", "bundle"] as const).map((v) => ({ value: v, label: ITEM_TYPE_LABEL[v] }));
const LIFECYCLE_OPTIONS = (["active", "inactive", "archived"] as const).map((v) => ({ value: v, label: LIFECYCLE_LABEL[v] }));

function Toolbar({ query, update }: { query: ItemQuery; update: (p: Partial<ItemQuery>) => void }) {
  const { data: lookups } = useLookups();
  const onSearch = useCallback((q: string) => update({ q }), [update]);
  return (
    <div className="flex flex-col gap-2.5 px-4 pt-4 pb-3 sm:px-5">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={query.q} onChange={onSearch} placeholder="Search by name, SKU or barcode…" label="Search items" className="w-full sm:w-[300px] sm:flex-none" />
        <WarehouseSelect className="w-full sm:w-auto" />
        {hasFilters(query) && (
          <OutlineButton icon={XIcon} onClick={() => update({ ...DEFAULT_ITEM_QUERY, sort: query.sort, dir: query.dir, size: query.size })} className="ml-auto">
            Clear filters
          </OutlineButton>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <FilterSelect label="Category" allLabel="All categories" value={query.category} onChange={(category) => update({ category })} options={(lookups?.categories ?? []).map((c) => ({ value: c, label: c }))} />
        <FilterSelect label="Brand" allLabel="All brands" value={query.brand} onChange={(brand) => update({ brand })} options={(lookups?.brands ?? []).map((b) => ({ value: b, label: b }))} />
        <FilterSelect label="Stock status" allLabel="Any stock status" value={query.stock} onChange={(stock) => update({ stock: stock as ItemQuery["stock"] })} options={STOCK_OPTIONS} />
        <FilterSelect label="Item type" allLabel="All item types" value={query.type} onChange={(type) => update({ type: type as ItemQuery["type"] })} options={TYPE_OPTIONS} />
        <FilterSelect label="Item status" allLabel="Active & inactive" value={query.lifecycle} onChange={(lifecycle) => update({ lifecycle: lifecycle as ItemQuery["lifecycle"] })} options={LIFECYCLE_OPTIONS} />
      </div>
    </div>
  );
}

// ── Table ────────────────────────────────────────────────────────────

interface Column {
  key: string;
  label: string;
  sort?: ItemSort;
  numeric?: boolean;
  className?: string;
}

const COLUMNS: Column[] = [
  { key: "sku", label: "SKU", sort: "sku" },
  { key: "category", label: "Category · Brand", sort: "category" },
  { key: "onHand", label: "On hand", sort: "onHand", numeric: true },
  { key: "reserved", label: "Reserved", sort: "reserved", numeric: true },
  { key: "available", label: "Available", sort: "available", numeric: true },
  { key: "reorder", label: "Reorder pt.", sort: "reorderPoint", numeric: true },
  { key: "cost", label: "Cost", sort: "cost", numeric: true },
  { key: "price", label: "Price", sort: "price", numeric: true },
  { key: "status", label: "Status" },
];

function SortHeader({ label, sort, query, update, numeric, className }: { label: string; sort?: ItemSort; query: ItemQuery; update: (p: Partial<ItemQuery>) => void; numeric?: boolean; className?: string }) {
  if (!sort)
    return (
      <th scope="col" className={cn(th, numeric && "text-right", className)}>
        {label}
      </th>
    );
  const active = query.sort === sort;
  const SortIcon = !active ? ArrowsDownUpIcon : query.dir === "asc" ? ArrowUpIcon : ArrowDownIcon;
  return (
    <th scope="col" aria-sort={active ? (query.dir === "asc" ? "ascending" : "descending") : "none"} className={cn(th, numeric && "text-right", className)}>
      <button
        type="button"
        onClick={() => update({ sort, dir: active && query.dir === "asc" ? "desc" : active ? "asc" : numeric ? "desc" : "asc" })}
        className={cn("inline-flex items-center gap-1 rounded transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-action", numeric && "flex-row-reverse", active && "text-ink")}
      >
        {label}
        <SortIcon size={12} aria-hidden className={cn(active ? "text-brand" : "text-ink-faint")} />
      </button>
    </th>
  );
}

type Selection = { selected: Set<string>; toggle: (id: string) => void; setMany: (ids: string[], on: boolean) => void };

function ItemTable({
  rows,
  query,
  update,
  selection,
  onOpen,
  onArchive,
  onRestore,
}: {
  rows: ProductRow[];
  query: ItemQuery;
  update: (p: Partial<ItemQuery>) => void;
  selection: Selection;
  onOpen: (id: string) => void;
  onArchive: (r: ProductRow) => void;
  onRestore: (r: ProductRow) => void;
}) {
  const pageIds = rows.map((r) => r.id);
  const selectedOnPage = pageIds.filter((id) => selection.selected.has(id)).length;
  const allOnPage = selectedOnPage === pageIds.length && pageIds.length > 0;
  const stickyA = "sticky left-0 z-[1] bg-white group-hover/row:bg-[#FCF8F9] group-data-[selected=true]/row:bg-brand-surface";
  const stickyB = "sticky left-11 z-[1] bg-white group-hover/row:bg-[#FCF8F9] group-data-[selected=true]/row:bg-brand-surface shadow-[1px_0_0_var(--border-soft)]";

  return (
    <div className="relative hidden overflow-x-auto scrollbar-thin md:block">
      <table className="w-full min-w-[1080px] border-collapse">
        <caption className="sr-only">Items and products</caption>
        <thead>
          <tr className="border-y border-line-soft bg-[#FAFAFB]">
            <th scope="col" className={cn(th, "sticky left-0 z-[1] w-11 bg-[#FAFAFB] pr-0")}>
              <Checkbox
                aria-label="Select all items on this page"
                checked={allOnPage ? true : selectedOnPage > 0 ? "indeterminate" : false}
                onCheckedChange={(v) => selection.setMany(pageIds, v === true)}
              />
            </th>
            <SortHeader label="Product" sort="name" query={query} update={update} className="sticky left-11 z-[1] min-w-[240px] bg-[#FAFAFB] pl-3 shadow-[1px_0_0_var(--border-soft)]" />
            {COLUMNS.map((c) => (
              <SortHeader key={c.key} label={c.label} sort={c.sort} numeric={c.numeric} query={query} update={update} />
            ))}
            <th scope="col" className={cn(th, "w-12")}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const selected = selection.selected.has(r.id);
            const muted = r.lifecycle !== "active";
            return (
              <tr
                key={r.id}
                data-selected={selected}
                onClick={() => onOpen(r.id)}
                className="group/row cursor-pointer border-b border-line-soft transition-colors last:border-0 hover:bg-[#FCF8F9] data-[selected=true]:bg-brand-surface"
              >
                <td className={cn(td, stickyA, "w-11 pr-0")} onClick={(e) => e.stopPropagation()}>
                  <Checkbox aria-label={`Select ${r.name}`} checked={selected} onCheckedChange={() => selection.toggle(r.id)} />
                </td>
                <td className={cn(td, stickyB, "pl-3")}>
                  <span className="flex min-w-0 items-center gap-3">
                    <ProductThumb icon={r.icon} size={36} className={cn(muted && "opacity-60")} />
                    <span className="min-w-0">
                      <Link
                        href={itemHref(r.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="block max-w-[220px] truncate rounded font-semibold text-ink hover:text-brand focus-visible:outline-2 focus-visible:outline-brand-action"
                      >
                        {r.name}
                      </Link>
                      <span className="block text-[12px] leading-4 text-ink-muted">{ITEM_TYPE_LABEL[r.type]}</span>
                    </span>
                  </span>
                </td>
                <td className={cn(td, "font-mono text-[12px] whitespace-nowrap text-ink")}>{r.sku}</td>
                <td className={cn(td, "whitespace-nowrap")}>
                  <span className="block">{r.category}</span>
                  <span className="block text-[12px] leading-4 text-ink-muted">{r.brand}</span>
                </td>
                <td className={cn(td, "text-right tabular-nums")}>{formatNumber(r.onHand)}</td>
                <td className={cn(td, "text-right tabular-nums")}>{formatNumber(r.reserved)}</td>
                <td className={cn(td, "text-right font-semibold text-ink tabular-nums")}>{formatNumber(r.available)}</td>
                <td className={cn(td, "text-right tabular-nums")}>{formatNumber(r.scopeReorderPoint)}</td>
                <td className={cn(td, "text-right whitespace-nowrap tabular-nums")}>{formatCurrency(r.costPrice)}</td>
                <td className={cn(td, "text-right whitespace-nowrap text-ink tabular-nums")}>{formatCurrency(r.sellingPrice)}</td>
                <td className={td}>
                  <StatusBadge status={r.status} />
                </td>
                <td className={cn(td, "text-right")} onClick={(e) => e.stopPropagation()}>
                  <ItemRowMenu item={r} onArchive={() => onArchive(r)} onRestore={() => onRestore(r)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Phones: one compact card per item instead of the wide table. */
function ItemCards({ rows, selection, onArchive, onRestore }: { rows: ProductRow[]; selection: Selection; onArchive: (r: ProductRow) => void; onRestore: (r: ProductRow) => void }) {
  return (
    <ul className="divide-y divide-line-soft border-t border-line-soft md:hidden">
      {rows.map((r) => (
        <li key={r.id} className={cn("relative flex gap-3 px-4 py-3.5", selection.selected.has(r.id) && "bg-brand-surface")}>
          <Checkbox aria-label={`Select ${r.name}`} checked={selection.selected.has(r.id)} onCheckedChange={() => selection.toggle(r.id)} className="relative z-10 mt-2.5" />
          <ProductThumb icon={r.icon} size={40} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <Link href={itemHref(r.id)} className="min-w-0 flex-1 rounded after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-brand-action">
                <span className="block truncate text-[14px] leading-5 font-semibold text-ink">{r.name}</span>
                <span className="block font-mono text-[12px] leading-4 text-ink-muted">{r.sku}</span>
              </Link>
              <div className="relative z-10 -mt-1 -mr-1">
                <ItemRowMenu item={r} onArchive={() => onArchive(r)} onRestore={() => onRestore(r)} />
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px] text-ink-body">
              <StatusBadge status={r.status} />
              <span>
                <span className="font-semibold text-ink tabular-nums">{formatNumber(r.available)}</span> available
              </span>
              <span className="text-ink-muted tabular-nums">{formatNumber(r.onHand)} on hand</span>
              <span className="ml-auto font-medium text-ink tabular-nums">{formatCurrency(r.sellingPrice)}</span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-1 border-t border-line-soft px-5 py-3" aria-busy="true" aria-label="Loading items">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="flex items-center gap-4 py-2">
          <Skeleton className="size-4 rounded" />
          <Skeleton className="size-9 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-48" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="hidden h-3.5 w-20 md:block" />
          <Skeleton className="hidden h-3.5 w-28 md:block" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────

function Heading({ actions }: { actions?: ReactNode }) {
  return (
    <PageHeading
      crumbs={[{ label: "Inventory" }, { label: "Items & Products" }]}
      title="Items & Products"
      description="Manage your products, stock levels and item details."
      actions={
        actions ?? (
          <Link href={NEW_ITEM_ROUTE} className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand px-4 text-button text-white">
            <PlusIcon size={16} weight="bold" aria-hidden /> New Item
          </Link>
        )
      }
    />
  );
}

export function ItemsViewFallback() {
  return (
    <PageShell>
      <Heading />
      <Card className="mt-5">
        <TableSkeleton />
      </Card>
    </PageShell>
  );
}

export function ItemsView() {
  const [query, update] = useItemQuery();
  const [scope] = useWarehouseScope();
  const hydrated = useHydrated();
  const effectiveScope = hydrated ? scope : "all";
  const { data: fetched, isError, isFetching, isPlaceholderData, refetch } = useItems(query, effectiveScope);
  const data = hydrated ? fetched : undefined;
  const router = useRouter();
  const archive = useArchiveFlow();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [exporting, setExporting] = useState(false);

  // "Back to Items" from an item returns to this exact list state.
  useEffect(() => setItemsListHref(`${ITEMS_ROUTE}${itemQueryString(query)}`), [query]);

  // A page past the end (e.g. after archiving) snaps back to the last page.
  useEffect(() => {
    if (data && !isPlaceholderData && data.page !== query.page) update({ page: data.page });
  }, [data, isPlaceholderData, query.page, update]);

  const selection: Selection = useMemo(
    () => ({
      selected,
      toggle: (id) =>
        setSelected((s) => {
          const n = new Set(s);
          if (n.has(id)) n.delete(id);
          else n.add(id);
          return n;
        }),
      setMany: (ids, on) =>
        setSelected((s) => {
          const n = new Set(s);
          ids.forEach((id) => (on ? n.add(id) : n.delete(id)));
          return n;
        }),
    }),
    [selected],
  );

  const runExport = async (ids: string[], label: string) => {
    setExporting(true);
    try {
      const rows = await getItemsByIds(ids, effectiveScope);
      const order = new Map(ids.map((id, i) => [id, i]));
      rows.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
      exportRows(rows, effectiveScope);
      toast.success(`Exported ${pluralize(rows.length, "item")}`, { description: `${label} · CSV file downloaded` });
    } catch {
      toast.error("Export failed", { description: "Please try again." });
    } finally {
      setExporting(false);
    }
  };

  const selectedIds = [...selected];
  const toggleSummary = (patch: Partial<ItemQuery>, isActive: boolean) =>
    update(isActive ? { stock: "", lifecycle: "" } : { stock: "", lifecycle: "", ...patch });

  return (
    <PageShell>
      <Heading
        actions={
          <>
            <UnavailableTip reason="Importing items from a file is coming soon">
              <OutlineButton icon={UploadSimpleIcon} disabled>
                Import
              </OutlineButton>
            </UnavailableTip>
            <OutlineButton icon={DownloadSimpleIcon} disabled={!data || data.total === 0 || exporting} onClick={() => data && runExport(data.allIds, "Filtered list")}>
              Export
            </OutlineButton>
            <PrimaryButton icon={PlusIcon} onClick={() => router.push(NEW_ITEM_ROUTE)}>
              New Item
            </PrimaryButton>
          </>
        }
      />

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryTile icon={CubeIcon} tone="neutral" label="Total Items" value={data?.summary.total} active={!query.stock && !query.lifecycle && hasFilters(query) === false} onClick={() => update({ ...DEFAULT_ITEM_QUERY, sort: query.sort, dir: query.dir, size: query.size })} />
        <SummaryTile icon={CheckCircleIcon} tone="brand" label="Active Items" value={data?.summary.active} active={query.lifecycle === "active" && !query.stock} onClick={() => toggleSummary({ lifecycle: "active" }, query.lifecycle === "active" && !query.stock)} />
        <SummaryTile icon={WarningIcon} tone="coral" label="Low Stock" value={data?.summary.lowStock} active={query.stock === "low-stock"} onClick={() => toggleSummary({ stock: "low-stock" }, query.stock === "low-stock")} />
        <SummaryTile icon={ProhibitIcon} tone="neutral" label="Out of Stock" value={data?.summary.outOfStock} active={query.stock === "out-of-stock"} onClick={() => toggleSummary({ stock: "out-of-stock" }, query.stock === "out-of-stock")} />
      </div>

      <Card className="mt-4" label="Items">
        <Toolbar query={query} update={update} />

        {effectiveScope !== "all" && (
          <p className="mx-4 mb-3 rounded-lg bg-[#F9FAFB] px-3 py-2 text-[12.5px] text-ink-body sm:mx-5">
            Stock columns show <span className="font-medium text-ink">{warehouseName(effectiveScope)}</span> only. Choose All Warehouses to see company-wide totals.
          </p>
        )}

        {selected.size > 0 && (
          <div className="mx-4 mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-brand-soft bg-brand-surface px-3 py-2 sm:mx-5" role="region" aria-label="Bulk actions">
            <span className="mr-1 text-[13px] font-medium text-ink">{pluralize(selected.size, "item")} selected</span>
            {data && data.total > selected.size && data.allIds.some((id) => !selected.has(id)) && (
              <button type="button" onClick={() => selection.setMany(data.allIds, true)} className="rounded text-[13px] font-medium text-brand hover:text-brand-press focus-visible:outline-2 focus-visible:outline-brand-action">
                Select all {data.total} matching
              </button>
            )}
            <div className="ml-auto flex flex-wrap gap-2">
              <OutlineButton icon={DownloadSimpleIcon} className="h-8" disabled={exporting} onClick={() => runExport(selectedIds, "Selected items")}>
                Export selected
              </OutlineButton>
              <OutlineButton
                icon={ArchiveIcon}
                className="h-8"
                onClick={() => archive.ask(selectedIds, selected.size === 1 ? (data?.items.find((r) => selected.has(r.id))?.name ?? "1 item") : pluralize(selected.size, "item"))}
              >
                Archive
              </OutlineButton>
              <OutlineButton icon={XIcon} className="h-8" onClick={() => setSelected(new Set())}>
                Clear
              </OutlineButton>
            </div>
          </div>
        )}

        {isError ? (
          <ErrorState hint="The item list couldn't be loaded." action={<OutlineButton onClick={() => refetch()}>Try again</OutlineButton>} />
        ) : !data ? (
          <TableSkeleton />
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={PackageIcon}
            title={hasFilters(query) ? "No items match your filters" : "No items yet"}
            hint={hasFilters(query) ? "Try a different search, or clear the filters." : "Create your first item to start tracking stock."}
            action={
              hasFilters(query) ? (
                <OutlineButton icon={XIcon} onClick={() => update({ ...DEFAULT_ITEM_QUERY, sort: query.sort, dir: query.dir, size: query.size })}>
                  Clear filters
                </OutlineButton>
              ) : (
                <PrimaryButton icon={PlusIcon} onClick={() => router.push(NEW_ITEM_ROUTE)}>
                  New Item
                </PrimaryButton>
              )
            }
          />
        ) : (
          <div className={cn("transition-opacity", isFetching && isPlaceholderData && "opacity-60")} aria-busy={isFetching && isPlaceholderData}>
            <ItemTable
              rows={data.items}
              query={query}
              update={update}
              selection={selection}
              onOpen={(id) => router.push(itemHref(id))}
              onArchive={(r) => archive.ask([r.id], r.name)}
              onRestore={(r) => archive.restore([r.id], r.name)}
            />
            <ItemCards rows={data.items} selection={selection} onArchive={(r) => archive.ask([r.id], r.name)} onRestore={(r) => archive.restore([r.id], r.name)} />
            <div className="border-t border-line-soft px-4 py-3 sm:px-5">
              <Pagination
                page={data.page}
                pageCount={data.pageCount}
                total={data.total}
                pageSize={query.size}
                pageSizes={PAGE_SIZES}
                noun={data.total === 1 ? "item" : "items"}
                onPage={(page) => update({ page })}
                onPageSize={(size) => update({ size: size as ItemQuery["size"] })}
              />
            </div>
          </div>
        )}
      </Card>
      {archive.dialog((ids) => selection.setMany(ids, false))}
    </PageShell>
  );
}
