"use client";

import { useMemo, useState } from "react";
import { CoinsIcon, CubeIcon, PencilSimpleIcon, StackIcon, WarningIcon } from "@phosphor-icons/react/dist/ssr";
import { DataTable, ListToolbar, matches, type Column } from "@/components/shared/data-table";
import { Detail, DetailGrid, DetailSkeleton, MissingRecord, PrototypeNote, StatRow, StatTile, TextLink } from "@/components/shared/doc-ui";
import { Card, CardHeader, FilterSelect, OutlineButton, PageHeading, PageShell, SearchInput, StatusBadge, ToneBadge, UnderlineTabs } from "@/components/shared/inventory-ui";
import { ProductThumb } from "@/components/shared/product-thumb";
import { EmptyState } from "@/components/shared/state-panels";
import { useProducts, useRecord } from "@/hooks/use-operations";
import { binFor, warehouseStats } from "@/lib/derive";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { available, STATUS_META, stockStatusOf } from "@/lib/inventory-meta";
import { INACTIVE_TONE, RECORD_STATUS } from "@/lib/operations-meta";
import { itemHref, ROUTES } from "@/lib/routes";
import type { ProductRow, StockStatus } from "@/lib/types/inventory";
import { WarehouseFormDialog } from "./warehouse-form";

type Tab = "stock" | "locations" | "details";
type StockRow = { p: ProductRow; bin: string; onHand: number; reserved: number; available: number; reorderPoint: number; status: StockStatus };

export function WarehouseDetailView({ id }: { id: string }) {
  const { data: w, isError } = useRecord("warehouses", id);
  const { data: products } = useProducts();
  const [tab, setTab] = useState<Tab>("stock");
  const [q, setQ] = useState("");
  const [stock, setStock] = useState("");
  const [editing, setEditing] = useState(false);
  const crumbs = [{ label: "Inventory" }, { label: "Warehouses & Locations", href: ROUTES.warehouses }, { label: w?.name ?? "Warehouse" }];

  const rows: StockRow[] | undefined = useMemo(() => {
    if (!w || !products) return undefined;
    return products
      .filter((p) => p.lifecycle !== "archived")
      .flatMap((p) => {
        const b = p.stock.find((x) => x.warehouseId === w.id);
        if (!b) return [];
        return [{ p, bin: binFor(p.id, p.category, p.costPrice, w.zones), onHand: b.onHand, reserved: b.reserved, available: available(b), reorderPoint: b.reorderPoint, status: stockStatusOf(available(b), b.reorderPoint) }];
      });
  }, [w, products]);
  const visible = useMemo(() => rows?.filter((r) => (!stock || (r.p.lifecycle === "active" && r.status === stock)) && matches(q, r.p.name, r.p.sku, r.bin)), [rows, stock, q]);

  if (isError) return <MissingRecord crumbs={crumbs} noun="warehouse" backHref={ROUTES.warehouses} backLabel="Back to Warehouses" />;
  if (!w || !products) return <DetailSkeleton crumbs={crumbs} />;
  const stats = warehouseStats(products, w.id);

  const columns: Column<StockRow>[] = [
    {
      key: "product",
      header: "Product",
      sortValue: (r) => r.p.name,
      cell: (r) => (
        <span className="flex min-w-[220px] items-center gap-3">
          <ProductThumb icon={r.p.icon} src={r.p.image} size={32} />
          <span className="min-w-0">
            <TextLink href={itemHref(r.p.id)} className="block truncate font-semibold">
              {r.p.name}
            </TextLink>
            <span className="block font-mono text-[12px] leading-4 text-ink-muted">{r.p.sku}</span>
          </span>
        </span>
      ),
    },
    { key: "bin", header: "Bin location", sortValue: (r) => r.bin, cell: (r) => <span className="font-mono text-[12.5px] text-ink">{r.bin}</span> },
    { key: "onHand", header: "On hand", align: "right", sortValue: (r) => r.onHand, cell: (r) => formatNumber(r.onHand) },
    { key: "reserved", header: "Reserved", align: "right", sortValue: (r) => r.reserved, cell: (r) => formatNumber(r.reserved) },
    { key: "available", header: "Available", align: "right", sortValue: (r) => r.available, cell: (r) => <span className="font-semibold text-ink">{formatNumber(r.available)}</span> },
    { key: "reorder", header: "Reorder pt.", align: "right", sortValue: (r) => r.reorderPoint, cell: (r) => formatNumber(r.reorderPoint) },
    { key: "value", header: "Value (at cost)", align: "right", sortValue: (r) => r.onHand * r.p.costPrice, cell: (r) => <span className="whitespace-nowrap">{formatCurrency(r.onHand * r.p.costPrice)}</span> },
    { key: "status", header: "Status", sortValue: (r) => r.status, cell: (r) => (r.p.lifecycle === "active" ? <StatusBadge status={r.status} /> : <StatusBadge status={r.p.lifecycle} />) },
  ];

  return (
    <PageShell>
      <PageHeading
        crumbs={crumbs}
        title={w.name}
        description={
          <>
            <span className="font-mono">{w.code}</span> · {w.address}, {w.city}
          </>
        }
        actions={
          <>
            <ToneBadge tone={w.status === "active" ? RECORD_STATUS.active : INACTIVE_TONE} />
            <OutlineButton icon={PencilSimpleIcon} onClick={() => setEditing(true)}>
              Edit
            </OutlineButton>
          </>
        }
      />
      <StatRow>
        <StatTile label="SKUs in stock" value={formatNumber(stats.skus)} icon={CubeIcon} tone="brand" />
        <StatTile label="Units on hand" value={formatNumber(stats.units)} note={`${formatNumber(stats.reserved)} reserved`} icon={StackIcon} />
        <StatTile label="Stock value (at cost)" value={formatCurrency(stats.value)} icon={CoinsIcon} />
        <StatTile label="Stock alerts" value={formatNumber(stats.lowStock + stats.outOfStock)} note={`${stats.lowStock} low · ${stats.outOfStock} out`} icon={WarningIcon} tone="coral" />
      </StatRow>

      <Card className="mt-4">
        <UnderlineTabs
          idPrefix="wh"
          label="Warehouse sections"
          value={tab}
          onChange={setTab}
          className="px-5 pt-3"
          tabs={[
            { value: "stock", label: "Stock by product", count: rows?.length },
            { value: "locations", label: "Storage locations", count: w.zones.length },
            { value: "details", label: "Details" },
          ]}
        />
        {tab === "stock" && (
          <div id="wh-panel-stock" role="tabpanel" aria-labelledby="wh-tab-stock">
            <ListToolbar
              canClear={!!(q || stock)}
              onClear={() => {
                setQ("");
                setStock("");
              }}
            >
              <SearchInput value={q} onChange={setQ} placeholder="Search product, SKU or bin…" label="Search stock" className="w-full sm:w-[300px]" />
              <FilterSelect label="Stock status" allLabel="Any stock status" value={stock} onChange={setStock} options={(["in-stock", "low-stock", "out-of-stock"] as const).map((v) => ({ value: v, label: STATUS_META[v].label }))} className="w-full sm:w-[190px]" />
            </ListToolbar>
            <DataTable
              rows={visible}
              columns={columns}
              rowKey={(r) => r.p.id}
              caption={`Stock at ${w.name}`}
              noun="products"
              defaultSort={{ key: "product", dir: "asc" }}
              resetKey={`${q}|${stock}`}
              empty={<EmptyState icon={CubeIcon} title={rows?.length ? "No products match" : "No stock held here"} hint={rows?.length ? "Try a different search or status." : "New warehouses start empty; this prototype doesn't move stock."} />}
            />
          </div>
        )}
        {tab === "locations" && (
          <div id="wh-panel-locations" role="tabpanel" aria-labelledby="wh-tab-locations" className="p-5 pt-4">
            {w.zones.length === 0 ? (
              <EmptyState icon={StackIcon} title="No storage zones set up" hint="Bin layouts for new warehouses aren't configurable in this prototype." />
            ) : (
              <>
                <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {w.zones.map((z) => (
                    <li key={z.code} className="rounded-xl border border-line p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[14px] leading-5 font-semibold text-ink">
                            Zone {z.code} · {z.name}
                          </p>
                          <p className="text-[12px] leading-4 text-ink-muted">
                            {z.kind} · {z.bins} bins · codes {z.code}-01 to {z.code}-{String(z.bins).padStart(2, "0")}
                          </p>
                        </div>
                        <span className="text-[13px] font-semibold text-ink tabular-nums">{z.utilisation}%</span>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#F2F4F7]" role="meter" aria-valuenow={z.utilisation} aria-valuemin={0} aria-valuemax={100} aria-label={`Zone ${z.code} utilisation`}>
                        <div className="h-full rounded-full bg-inventory-hover" style={{ width: `${z.utilisation}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[12px] leading-4 text-ink-muted">Utilisation and bin assignments are illustrative demo values.</p>
              </>
            )}
          </div>
        )}
        {tab === "details" && (
          <div id="wh-panel-details" role="tabpanel" aria-labelledby="wh-tab-details">
            <CardHeader title="Warehouse details" />
            <DetailGrid>
              <Detail label="Name">{w.name}</Detail>
              <Detail label="Short name">{w.short}</Detail>
              <Detail label="Code" mono>
                {w.code}
              </Detail>
              <Detail label="Address" className="sm:col-span-2">
                {w.address}, {w.city}
              </Detail>
              <Detail label="Status">{w.status === "active" ? "Active" : "Inactive"}</Detail>
              <Detail label="Contact person">{w.contactName}</Detail>
              <Detail label="Phone">{w.phone}</Detail>
              <Detail label="Email">{w.email}</Detail>
              <Detail label="Created">{formatDate(w.createdAt)}</Detail>
            </DetailGrid>
          </div>
        )}
      </Card>
      <PrototypeNote className="mt-4">Stock figures are the shared demo balances also shown on Items and the Dashboard. Nothing on this page moves stock.</PrototypeNote>
      {editing && <WarehouseFormDialog warehouse={w} onClose={() => setEditing(false)} />}
    </PageShell>
  );
}
