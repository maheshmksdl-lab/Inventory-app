"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPinIcon, PencilSimpleIcon, PlusIcon, WarehouseIcon } from "@phosphor-icons/react/dist/ssr";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, ListToolbar, matches, type Column } from "@/components/shared/data-table";
import { TextLink } from "@/components/shared/doc-ui";
import { Card, FilterSelect, PageHeading, PageShell, PrimaryButton, SearchInput, ToneBadge } from "@/components/shared/inventory-ui";
import { RowMenu } from "@/components/shared/row-menu";
import { EmptyState } from "@/components/shared/state-panels";
import { useProducts, useRecords } from "@/hooks/use-operations";
import { warehouseStats, type WarehouseStats } from "@/lib/derive";
import { formatCurrency, formatNumber } from "@/lib/format";
import { INACTIVE_TONE, RECORD_STATUS } from "@/lib/operations-meta";
import { recordHref } from "@/lib/routes";
import type { WarehouseRecord } from "@/lib/types/operations";
import { WarehouseFormDialog } from "./warehouse-form";

type Row = WarehouseRecord & { stats: WarehouseStats };

function OverviewCard({ w }: { w: Row }) {
  const util = w.zones.length ? Math.round(w.zones.reduce((s, z) => s + z.utilisation * z.bins, 0) / w.zones.reduce((s, z) => s + z.bins, 0)) : 0;
  return (
    <Link
      href={recordHref("warehouses", w.id)}
      className="group flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-card p-4 shadow-card transition-colors hover:border-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action"
    >
      <span className="flex items-start gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-inventory-surface text-inventory" aria-hidden>
          <WarehouseIcon size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] leading-5 font-semibold text-ink group-hover:text-brand">{w.name}</span>
          <span className="block truncate text-[12px] leading-4 text-ink-muted">
            <span className="font-mono">{w.code}</span> · {w.city}
          </span>
        </span>
        {w.status === "inactive" && <ToneBadge tone={INACTIVE_TONE} />}
      </span>
      <span className="grid grid-cols-3 gap-2 text-[12px] leading-4 text-ink-muted">
        <span>
          SKUs
          <span className="mt-0.5 block text-[16px] leading-6 font-semibold text-ink tabular-nums">{formatNumber(w.stats.skus)}</span>
        </span>
        <span>
          Units
          <span className="mt-0.5 block text-[16px] leading-6 font-semibold text-ink tabular-nums">{formatNumber(w.stats.units)}</span>
        </span>
        <span>
          Value
          <span className="mt-0.5 block truncate text-[16px] leading-6 font-semibold text-ink tabular-nums">{formatCurrency(w.stats.value)}</span>
        </span>
      </span>
      <span className="block">
        <span className="flex justify-between text-[12px] leading-4 text-ink-muted">
          <span>Bin utilisation (illustrative)</span>
          <span className="tabular-nums">{w.zones.length ? `${util}%` : "No bins"}</span>
        </span>
        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-[#F2F4F7]" aria-hidden>
          <span className="block h-full rounded-full bg-inventory-hover" style={{ width: `${util}%` }} />
        </span>
      </span>
      <span className="text-[12px] leading-4 text-ink-muted">
        {w.stats.lowStock + w.stats.outOfStock > 0 ? (
          <span className="font-medium text-[var(--warning)]">
            {w.stats.lowStock} low · {w.stats.outOfStock} out of stock
          </span>
        ) : (
          "No stock alerts"
        )}
      </span>
    </Link>
  );
}

export function WarehousesView() {
  const router = useRouter();
  const { data: warehouses } = useRecords("warehouses");
  const { data: products } = useProducts();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [city, setCity] = useState("");
  const [editing, setEditing] = useState<WarehouseRecord | null | "new">(null);

  const rows: Row[] | undefined = useMemo(() => (warehouses && products ? warehouses.map((w) => ({ ...w, stats: warehouseStats(products, w.id) })) : undefined), [warehouses, products]);
  const filtered = useMemo(() => rows?.filter((w) => (!status || w.status === status) && (!city || w.city === city) && matches(q, w.name, w.code, w.city, w.address, w.contactName)), [rows, status, city, q]);
  const cities = [...new Set((warehouses ?? []).map((w) => w.city))].sort();

  const columns: Column<Row>[] = [
    {
      key: "name",
      header: "Warehouse",
      sortValue: (w) => w.name,
      cell: (w) => (
        <span className="block min-w-[180px]">
          <TextLink href={recordHref("warehouses", w.id)} className="font-semibold">
            {w.name}
          </TextLink>
          <span className="block font-mono text-[12px] leading-4 text-ink-muted">{w.code}</span>
        </span>
      ),
    },
    {
      key: "address",
      header: "Address",
      sortValue: (w) => w.city,
      cell: (w) => (
        <span className="block max-w-[260px]">
          <span className="block truncate">{w.address}</span>
          <span className="block text-[12px] leading-4 text-ink-muted">{w.city}</span>
        </span>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      cell: (w) => (
        <span className="block whitespace-nowrap">
          <span className="block">{w.contactName}</span>
          <span className="block text-[12px] leading-4 text-ink-muted">{w.phone}</span>
        </span>
      ),
    },
    { key: "skus", header: "SKUs", align: "right", sortValue: (w) => w.stats.skus, cell: (w) => formatNumber(w.stats.skus) },
    { key: "units", header: "Stock qty", align: "right", sortValue: (w) => w.stats.units, cell: (w) => <span className="font-semibold text-ink">{formatNumber(w.stats.units)}</span> },
    { key: "value", header: "Value (at cost)", align: "right", sortValue: (w) => w.stats.value, cell: (w) => <span className="whitespace-nowrap">{formatCurrency(w.stats.value)}</span> },
    { key: "status", header: "Status", sortValue: (w) => w.status, cell: (w) => <ToneBadge tone={w.status === "active" ? RECORD_STATUS.active : INACTIVE_TONE} /> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      headerClassName: "w-12",
      cell: (w) => (
        <RowMenu
          label={`Actions for ${w.name}`}
          actions={[
            { label: "View details", icon: MapPinIcon, href: recordHref("warehouses", w.id) },
            { label: "Edit", icon: PencilSimpleIcon, onSelect: () => setEditing(w) },
          ]}
        />
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeading
        crumbs={[{ label: "Inventory" }, { label: "Warehouses & Locations" }]}
        title="Warehouses & Locations"
        description="Where stock is held, who runs each site and how its storage is laid out."
        actions={
          <PrimaryButton icon={PlusIcon} onClick={() => setEditing("new")}>
            New Warehouse
          </PrimaryButton>
        }
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows ? rows.filter((w) => w.status === "active").map((w) => <OverviewCard key={w.id} w={w} />) : Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[196px] rounded-xl" />)}
      </div>
      <Card className="mt-4" label="All warehouses">
        <ListToolbar
          canClear={!!(q || status || city)}
          onClear={() => {
            setQ("");
            setStatus("");
            setCity("");
          }}
        >
          <SearchInput value={q} onChange={setQ} placeholder="Search name, code, city or contact…" label="Search warehouses" className="w-full sm:w-[300px]" />
          <FilterSelect label="City" allLabel="All cities" value={city} onChange={setCity} options={cities.map((c) => ({ value: c, label: c }))} className="w-full sm:w-[170px]" />
          <FilterSelect
            label="Status"
            allLabel="All statuses"
            value={status}
            onChange={setStatus}
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
            className="w-full sm:w-[170px]"
          />
        </ListToolbar>
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(w) => w.id}
          onRowClick={(w) => router.push(recordHref("warehouses", w.id))}
          caption="Warehouses"
          noun="warehouses"
          resetKey={`${q}|${status}|${city}`}
          defaultSort={{ key: "name", dir: "asc" }}
          empty={<EmptyState icon={WarehouseIcon} title="No warehouses match" hint="Try a different search or filter." />}
        />
      </Card>
      {editing && <WarehouseFormDialog warehouse={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </PageShell>
  );
}
