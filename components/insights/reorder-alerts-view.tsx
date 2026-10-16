"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellRingingIcon, CoinsIcon, ProhibitIcon, ShoppingCartIcon, WarningIcon } from "@phosphor-icons/react/dist/ssr";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable, ListToolbar, matches, type Column } from "@/components/shared/data-table";
import { PrototypeNote, StatRow, StatTile, TextLink } from "@/components/shared/doc-ui";
import { Card, FilterSelect, PageHeading, PageShell, PrimaryButton, SearchInput, ToneBadge } from "@/components/shared/inventory-ui";
import { ProductThumb } from "@/components/shared/product-thumb";
import { EmptyState } from "@/components/shared/state-panels";
import { useProducts, useRecords, useSettings } from "@/hooks/use-operations";
import { reorderAlerts, warehouseLabel, type ReorderAlert } from "@/lib/derive";
import { formatCurrency, formatNumber, pluralize } from "@/lib/format";
import { ALERT_SEVERITY } from "@/lib/operations-meta";
import { itemHref, newHref, ROUTES } from "@/lib/routes";

const preferredVendor = (a: ReorderAlert) => a.product.suppliers.find((s) => s.preferred)?.vendorId ?? a.product.suppliers[0]?.vendorId ?? "";
const draftPoHref = (list: ReorderAlert[]) =>
  newHref("purchaseOrders", { vendor: preferredVendor(list[0]), warehouse: list[0].warehouseId, lines: list.map((a) => `${a.product.id}:${Math.max(1, a.suggested)}`).join(",") });

export function ReorderAlertsView({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const { data: products } = useProducts();
  const { data: pos } = useRecords("purchaseOrders");
  const { data: warehouses } = useRecords("warehouses");
  const { data: vendors } = useRecords("vendors");
  const { data: settings } = useSettings();
  const [q, setQ] = useState(initialQuery);
  const [warehouse, setWarehouse] = useState("");
  const [severity, setSeverity] = useState("");
  const [vendor, setVendor] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const alerts = useMemo(() => (products && pos && settings ? reorderAlerts(products, pos, settings.reorderSuggestion) : undefined), [products, pos, settings]);
  const rows = useMemo(
    () => alerts?.filter((a) => (!warehouse || a.warehouseId === warehouse) && (!severity || a.severity === severity) && (!vendor || preferredVendor(a) === vendor) && matches(q, a.product.name, a.product.sku, a.product.category)),
    [alerts, warehouse, severity, vendor, q],
  );
  const filtered = !!(q || warehouse || severity || vendor);
  const vendorName = (id: string) => vendors?.find((v) => v.id === id)?.name ?? "—";
  const chosen = (alerts ?? []).filter((a) => selected.has(a.key));
  const sameGroup = chosen.length > 0 && chosen.every((a) => preferredVendor(a) === preferredVendor(chosen[0]) && a.warehouseId === chosen[0].warehouseId);
  const toggle = (key: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });

  const columns: Column<ReorderAlert>[] = [
    {
      key: "select",
      header: <span className="sr-only">Select</span>,
      headerClassName: "w-10",
      cell: (a) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={selected.has(a.key)} onCheckedChange={() => toggle(a.key)} aria-label={`Select ${a.product.name} at ${warehouseLabel(warehouses, a.warehouseId)}`} />
        </span>
      ),
    },
    {
      key: "product",
      header: "Product",
      sortValue: (a) => a.product.name,
      cell: (a) => (
        <span className="flex min-w-[200px] items-center gap-3">
          <ProductThumb icon={a.product.icon} src={a.product.image} size={30} />
          <span className="min-w-0">
            <TextLink href={itemHref(a.product.id)} className="block truncate">
              {a.product.name}
            </TextLink>
            <span className="block font-mono text-[12px] leading-4 text-ink-muted">{a.product.sku}</span>
          </span>
        </span>
      ),
    },
    { key: "warehouse", header: "Warehouse", sortValue: (a) => warehouseLabel(warehouses, a.warehouseId), cell: (a) => <span className="whitespace-nowrap">{warehouseLabel(warehouses, a.warehouseId)}</span> },
    { key: "severity", header: "Severity", sortValue: (a) => ["critical", "high", "medium"].indexOf(a.severity), cell: (a) => <ToneBadge tone={ALERT_SEVERITY[a.severity]} /> },
    { key: "available", header: "Available", align: "right", sortValue: (a) => a.available, cell: (a) => <span className="font-semibold text-ink">{formatNumber(a.available)}</span> },
    { key: "rp", header: "Reorder pt.", align: "right", sortValue: (a) => a.reorderPoint, cell: (a) => formatNumber(a.reorderPoint) },
    { key: "incoming", header: "On order", align: "right", sortValue: (a) => a.incoming, cell: (a) => (a.incoming ? formatNumber(a.incoming) : <span className="text-ink-muted">0</span>) },
    { key: "suggested", header: "Suggested qty", align: "right", sortValue: (a) => a.suggested, cell: (a) => <span className="font-semibold text-ink">{formatNumber(a.suggested)}</span> },
    { key: "cost", header: "Est. cost", align: "right", sortValue: (a) => a.suggested * a.product.costPrice, cell: (a) => <span className="whitespace-nowrap">{formatCurrency(a.suggested * a.product.costPrice)}</span> },
    { key: "vendor", header: "Preferred vendor", sortValue: (a) => vendorName(preferredVendor(a)), cell: (a) => <span className="whitespace-nowrap">{vendorName(preferredVendor(a))}</span> },
    {
      key: "action",
      header: <span className="sr-only">Action</span>,
      cell: (a) =>
        a.suggested > 0 ? (
          <Link href={draftPoHref([a])} onClick={(e) => e.stopPropagation()} className="rounded text-[12.5px] font-medium whitespace-nowrap text-brand hover:text-brand-press focus-visible:outline-2 focus-visible:outline-brand-action">
            Draft PO
          </Link>
        ) : (
          <span className="text-[12px] whitespace-nowrap text-ink-muted">Covered by open POs</span>
        ),
    },
  ];

  return (
    <PageShell>
      <PageHeading
        crumbs={[{ label: "Insights" }, { label: "Reorder Alerts" }]}
        title="Reorder Alerts"
        description="Warehouse locations at or below their reorder point, with a suggested quantity to order."
        actions={
          <PrimaryButton icon={ShoppingCartIcon} disabled={!sameGroup} onClick={() => router.push(draftPoHref(chosen))}>
            Draft PO for selected{chosen.length ? ` (${chosen.length})` : ""}
          </PrimaryButton>
        }
      />
      <StatRow>
        <StatTile label="Out of stock" value={alerts?.filter((a) => a.severity === "critical").length} note="Locations with nothing available" icon={ProhibitIcon} tone="coral" />
        <StatTile label="High" value={alerts?.filter((a) => a.severity === "high").length} note="At or below half the reorder point" icon={WarningIcon} />
        <StatTile label="Low" value={alerts?.filter((a) => a.severity === "medium").length} note="At or below the reorder point" icon={BellRingingIcon} />
        <StatTile label="Suggested spend" value={rows ? formatCurrency(rows.reduce((s, a) => s + a.suggested * a.product.costPrice, 0)) : undefined} note="At item cost price" icon={CoinsIcon} tone="brand" />
      </StatRow>
      {chosen.length > 0 && !sameGroup && (
        <p className="mt-3 rounded-lg border border-[#FEDF89] bg-[var(--warning-bg)] px-3 py-2 text-[12.5px] text-[var(--warning)]">
          A draft PO goes to one vendor for one warehouse. {pluralize(chosen.length, "selected alert")} span several — narrow the selection, or use the Vendor and Warehouse filters.
        </p>
      )}
      <Card className="mt-4" label="Reorder alerts">
        <ListToolbar
          canClear={filtered}
          onClear={() => {
            setQ("");
            setWarehouse("");
            setSeverity("");
            setVendor("");
          }}
        >
          <SearchInput value={q} onChange={setQ} placeholder="Search product, SKU or category…" label="Search alerts" className="w-full sm:w-[260px]" />
          <FilterSelect label="Warehouse" allLabel="All warehouses" value={warehouse} onChange={setWarehouse} options={(warehouses ?? []).map((w) => ({ value: w.id, label: w.name }))} className="w-full sm:w-[170px]" />
          <FilterSelect label="Severity" allLabel="All severities" value={severity} onChange={setSeverity} options={Object.entries(ALERT_SEVERITY).map(([value, t]) => ({ value, label: t.label }))} className="w-full sm:w-[160px]" />
          <FilterSelect label="Preferred vendor" allLabel="All vendors" value={vendor} onChange={setVendor} options={(vendors ?? []).filter((v) => v.status === "active").map((v) => ({ value: v.id, label: v.name }))} className="w-full sm:w-[190px]" />
        </ListToolbar>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(a) => a.key}
          onRowClick={(a) => toggle(a.key)}
          rowClassName={(a) => (selected.has(a.key) ? "bg-brand-surface" : undefined)}
          caption="Reorder alerts"
          noun="alerts"
          minWidth={1260}
          resetKey={`${q}|${warehouse}|${severity}|${vendor}`}
          empty={<EmptyState icon={BellRingingIcon} title={filtered ? "No alerts match" : "No reorder alerts"} hint={filtered ? "Try different filters." : "Every location is above its reorder point."} />}
        />
      </Card>
      <PrototypeNote className="mt-4" label="How it's calculated">
        An alert appears when available (on hand − reserved) is at or below a warehouse&apos;s reorder point. Suggested qty = target − available − on order, where the target is {settings?.reorderSuggestion === "to-reorder-point" ? "the reorder point" : "twice the reorder point"} (change in{" "}
        <Link href={`${ROUTES.settings}?tab=inventory`} className="font-medium text-brand hover:text-brand-press">
          Settings
        </Link>
        ). &ldquo;On order&rdquo; counts unreceived quantities on pending, confirmed and partially received POs. Draft POs open prefilled; nothing is ordered.
      </PrototypeNote>
    </PageShell>
  );
}

