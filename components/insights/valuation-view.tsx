"use client";

import { useMemo, useState } from "react";
import { CoinsIcon, CubeIcon, DownloadSimpleIcon, StackIcon, WarehouseIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, ListToolbar, matches, sortRows, type Column, type SortState } from "@/components/shared/data-table";
import { PrototypeNote, StatRow, StatTile, TextLink } from "@/components/shared/doc-ui";
import { Card, CardHeader, FilterSelect, FormField, OutlineButton, PageHeading, PageShell, SearchInput, SelectField, td } from "@/components/shared/inventory-ui";
import { ProductThumb } from "@/components/shared/product-thumb";
import { EmptyState } from "@/components/shared/state-panels";
import { useProducts, useRecords } from "@/hooks/use-operations";
import { downloadCsv } from "@/lib/csv";
import { COST_BASIS_LABEL, unitCostOf, type CostBasis } from "@/lib/derive";
import { formatCurrency, formatNumber, pluralize, toIsoDate } from "@/lib/format";
import { itemHref } from "@/lib/routes";
import type { ProductRow } from "@/lib/types/inventory";
import { cn } from "@/lib/utils";

type Row = { p: ProductRow; onHand: number; unitCost: number; value: number };

/** Illustrative valuation: on-hand quantity × a demo cost basis. Not accounting-grade. */
export function ValuationView() {
  const { data: products } = useProducts();
  const { data: warehouses } = useRecords("warehouses");
  const [basis, setBasis] = useState<CostBasis>("standard");
  const [warehouse, setWarehouse] = useState("");
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortState | null>({ key: "value", dir: "desc" });

  const live = useMemo(() => (products ?? []).filter((p) => p.lifecycle !== "archived"), [products]);
  const qtyAt = (p: ProductRow, w: string) => (w ? (p.stock.find((b) => b.warehouseId === w)?.onHand ?? 0) : p.stock.reduce((s, b) => s + b.onHand, 0));
  const rows: Row[] | undefined = useMemo(() => {
    if (!products) return undefined;
    return live
      .filter((p) => (!category || p.category === category) && matches(q, p.name, p.sku))
      .map((p) => {
        const onHand = qtyAt(p, warehouse);
        const unitCost = unitCostOf(p, basis);
        return { p, onHand, unitCost, value: onHand * unitCost };
      })
      .filter((r) => r.onHand > 0);
  }, [products, live, category, q, warehouse, basis]);
  const total = rows?.reduce((s, r) => s + r.value, 0) ?? 0;
  const units = rows?.reduce((s, r) => s + r.onHand, 0) ?? 0;
  const byWarehouse = (warehouses ?? []).map((w) => ({ w, value: live.reduce((s, p) => s + qtyAt(p, w.id) * unitCostOf(p, basis), 0) })).filter((x) => x.value > 0);
  const grand = byWarehouse.reduce((s, x) => s + x.value, 0);
  const categories = [...new Set(live.map((p) => p.category))].sort();

  const columns: Column<Row>[] = [
    {
      key: "product",
      header: "Product",
      sortValue: (r) => r.p.name,
      cell: (r) => (
        <span className="flex min-w-[200px] items-center gap-3">
          <ProductThumb icon={r.p.icon} size={30} />
          <TextLink href={itemHref(r.p.id)} className="truncate">
            {r.p.name}
          </TextLink>
        </span>
      ),
    },
    { key: "sku", header: "SKU", sortValue: (r) => r.p.sku, cell: (r) => <span className="font-mono text-[12px]">{r.p.sku}</span> },
    { key: "category", header: "Category", sortValue: (r) => r.p.category, cell: (r) => r.p.category },
    { key: "onHand", header: "On hand", align: "right", sortValue: (r) => r.onHand, cell: (r) => formatNumber(r.onHand) },
    { key: "unitCost", header: "Unit cost", align: "right", sortValue: (r) => r.unitCost, cell: (r) => <span className="whitespace-nowrap">{formatCurrency(r.unitCost)}</span> },
    { key: "value", header: "Total value", align: "right", sortValue: (r) => r.value, cell: (r) => <span className="font-semibold whitespace-nowrap text-ink">{formatCurrency(r.value)}</span> },
    { key: "share", header: "Share", align: "right", sortValue: (r) => r.value, cell: (r) => <span className="text-ink-muted">{total ? `${((r.value / total) * 100).toFixed(1)}%` : "—"}</span> },
  ];

  const exportCsv = () => {
    if (!rows?.length) return;
    const sorted = sortRows(rows, columns, sort);
    downloadCsv(
      `evoq-inventory-valuation-${toIsoDate(new Date())}.csv`,
      ["Product", "SKU", "Category", "Warehouse", "On hand", "Unit cost", "Total value", "Cost basis"],
      sorted.map((r) => [r.p.name, r.p.sku, r.p.category, warehouse ? (warehouses?.find((w) => w.id === warehouse)?.name ?? "") : "All warehouses", r.onHand, r.unitCost, r.value, COST_BASIS_LABEL[basis]]),
    );
    toast.success(`Exported ${pluralize(sorted.length, "product")}`, { description: "Illustrative valuation from demo data." });
  };

  return (
    <PageShell>
      <PageHeading
        crumbs={[{ label: "Insights" }, { label: "Inventory Valuation" }]}
        title="Inventory Valuation"
        description="What the stock on hand is worth, by warehouse and product."
        actions={
          <OutlineButton icon={DownloadSimpleIcon} onClick={exportCsv} disabled={!rows?.length}>
            Export CSV
          </OutlineButton>
        }
      />
      <PrototypeNote className="mt-5" label="Illustrative">
        Value = on-hand quantity × unit cost under the selected demo cost basis. This is not an accounting-grade valuation (no FIFO layers, landed costs or ledger postings).
      </PrototypeNote>
      <StatRow className="mt-4">
        <StatTile label="Total inventory value" value={rows ? formatCurrency(total) : undefined} note={warehouse ? warehouses?.find((w) => w.id === warehouse)?.name : "All warehouses"} icon={CoinsIcon} tone="brand" />
        <StatTile label="Products with stock" value={rows ? formatNumber(rows.length) : undefined} icon={CubeIcon} />
        <StatTile label="Units on hand" value={rows ? formatNumber(units) : undefined} icon={StackIcon} />
        <StatTile label="Average unit cost" value={rows ? (units ? formatCurrency(total / units) : "—") : undefined} note="Value ÷ units" />
      </StatRow>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,2.2fr)]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Cost basis" />
            <div className="px-5 pb-5">
              <FormField label="Value stock at" htmlFor="val-basis" hint={basis === "standard" ? "Each item's cost price from Items & Products." : "The preferred supplier's last quoted cost."}>
                <SelectField id="val-basis" value={basis} onChange={(v) => setBasis(v as CostBasis)} options={Object.entries(COST_BASIS_LABEL).map(([value, label]) => ({ value, label }))} />
              </FormField>
            </div>
          </Card>
          <Card>
            <CardHeader title="By warehouse" subtitle="All categories" />
            <ul className="space-y-3 px-5 pb-5">
              {!products && <Skeleton className="h-24 rounded-lg" />}
              {byWarehouse.map(({ w, value }) => (
                <li key={w.id}>
                  <button
                    type="button"
                    onClick={() => setWarehouse(warehouse === w.id ? "" : w.id)}
                    aria-pressed={warehouse === w.id}
                    className={cn("w-full rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-brand-action", warehouse === w.id ? "border-brand-soft bg-brand-surface" : "border-line hover:border-[#D0D5DD]")}
                  >
                    <span className="flex items-center justify-between gap-3 text-[13px]">
                      <span className="flex items-center gap-2 font-medium text-ink">
                        <WarehouseIcon size={16} aria-hidden className="text-ink-muted" /> {w.name}
                      </span>
                      <span className="font-semibold text-ink tabular-nums">{formatCurrency(value)}</span>
                    </span>
                    <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-[#F2F4F7]" aria-hidden>
                      <span className="block h-full rounded-full bg-inventory-hover" style={{ width: `${grand ? (value / grand) * 100 : 0}%` }} />
                    </span>
                    <span className="mt-1 block text-[12px] text-ink-muted">{grand ? `${((value / grand) * 100).toFixed(1)}% of total` : ""}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <Card label="Product valuation">
          <ListToolbar
            canClear={!!(q || category || warehouse)}
            onClear={() => {
              setQ("");
              setCategory("");
              setWarehouse("");
            }}
          >
            <SearchInput value={q} onChange={setQ} placeholder="Search product or SKU…" label="Search products" className="w-full sm:w-[240px]" />
            <FilterSelect label="Warehouse" allLabel="All warehouses" value={warehouse} onChange={setWarehouse} options={(warehouses ?? []).map((w) => ({ value: w.id, label: w.name }))} className="w-full sm:w-[170px]" />
            <FilterSelect label="Category" allLabel="All categories" value={category} onChange={setCategory} options={categories.map((c) => ({ value: c, label: c }))} className="w-full sm:w-[170px]" />
          </ListToolbar>
          <DataTable
            rows={rows}
            columns={columns}
            rowKey={(r) => r.p.id}
            caption="Product valuation"
            noun="products"
            minWidth={820}
            sort={sort}
            onSortChange={setSort}
            resetKey={`${q}|${category}|${warehouse}|${basis}`}
            empty={<EmptyState icon={CoinsIcon} title="No stock to value" hint="Nothing on hand matches these filters." />}
            footer={
              rows && rows.length > 0 ? (
                <tr className="border-t border-line bg-[#FAFAFB]">
                  <th scope="row" colSpan={3} className={cn(td, "text-left font-semibold text-ink")}>
                    Total ({pluralize(rows.length, "product")})
                  </th>
                  <td className={cn(td, "text-right font-semibold text-ink tabular-nums")}>{formatNumber(units)}</td>
                  <td className={td} />
                  <td className={cn(td, "text-right font-semibold text-ink tabular-nums")}>{formatCurrency(total)}</td>
                  <td className={cn(td, "text-right text-ink-muted")}>100%</td>
                </tr>
              ) : undefined
            }
          />
        </Card>
      </div>
    </PageShell>
  );
}
