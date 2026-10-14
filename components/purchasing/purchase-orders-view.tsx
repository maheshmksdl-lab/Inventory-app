"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarIcon, ClockIcon, PlusIcon, ShoppingCartIcon, WarningIcon } from "@phosphor-icons/react/dist/ssr";
import { DataTable, DateRange, inRange, ListToolbar, matches } from "@/components/shared/data-table";
import { PrimaryLink, PrototypeNote, StatRow, StatTile } from "@/components/shared/doc-ui";
import { Card, FilterSelect, PageHeading, PageShell, SearchInput } from "@/components/shared/inventory-ui";
import { EmptyState } from "@/components/shared/state-panels";
import { useProducts, useRecords } from "@/hooks/use-operations";
import { addDays, formatCurrency, formatNumber, toIsoDate } from "@/lib/format";
import { PO_STATUS } from "@/lib/operations-meta";
import { newHref, recordHref } from "@/lib/routes";
import { poColumns, poTotal, vendorLabel } from "./po-columns";

const OPEN = ["pending-approval", "confirmed", "partially-received"];

export function PurchaseOrdersView({ initialStatus = "" }: { initialStatus?: string }) {
  const router = useRouter();
  const { data: pos } = useRecords("purchaseOrders");
  const { data: vendors } = useRecords("vendors");
  const { data: warehouses } = useRecords("warehouses");
  const { data: products } = useProducts();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(PO_STATUS[initialStatus as keyof typeof PO_STATUS] ? initialStatus : "");
  const [vendor, setVendor] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [dates, setDates] = useState({ from: "", to: "" });
  const names = useMemo(() => new Map((products ?? []).map((p) => [p.id, `${p.name} ${p.sku}`])), [products]);
  const today = toIsoDate(new Date());

  const rows = useMemo(
    () =>
      pos?.filter(
        (p) =>
          (!status || p.status === status) &&
          (!vendor || p.vendorId === vendor) &&
          (!warehouse || p.warehouseId === warehouse) &&
          inRange(p.orderDate, dates.from, dates.to) &&
          matches(q, p.number, vendorLabel(vendors, p.vendorId), ...p.lines.map((l) => names.get(l.productId))),
      ),
    [pos, status, vendor, warehouse, dates, q, vendors, names],
  );
  const filtered = !!(q || status || vendor || warehouse || dates.from || dates.to);
  const open = pos?.filter((p) => OPEN.includes(p.status));
  const awaitingDelivery = pos?.filter((p) => p.status === "confirmed" || p.status === "partially-received");

  return (
    <PageShell>
      <PageHeading
        crumbs={[{ label: "Purchasing" }, { label: "Purchase Orders" }]}
        title="Purchase Orders"
        description="Orders placed with vendors, from draft through approval to receipt."
        actions={
          <PrimaryLink href={newHref("purchaseOrders")} icon={PlusIcon}>
            New Purchase Order
          </PrimaryLink>
        }
      />
      <StatRow>
        <StatTile label="Open orders" value={open ? formatNumber(open.length) : undefined} note={open ? formatCurrency(open.reduce((s, p) => s + poTotal(p), 0)) : undefined} icon={ShoppingCartIcon} tone="brand" />
        <StatTile label="Pending approval" value={pos?.filter((p) => p.status === "pending-approval").length} icon={ClockIcon} />
        <StatTile label="Due in the next 7 days" value={awaitingDelivery?.filter((p) => p.expectedDate >= today && p.expectedDate <= addDays(today, 7)).length} icon={CalendarIcon} />
        <StatTile label="Late deliveries" value={awaitingDelivery?.filter((p) => p.expectedDate < today).length} note="Expected date has passed" icon={WarningIcon} tone="coral" />
      </StatRow>
      <Card className="mt-4" label="Purchase orders">
        <ListToolbar
          canClear={filtered}
          onClear={() => {
            setQ("");
            setStatus("");
            setVendor("");
            setWarehouse("");
            setDates({ from: "", to: "" });
          }}
        >
          <SearchInput value={q} onChange={setQ} placeholder="Search PO number, vendor or product…" label="Search purchase orders" className="w-full sm:w-[280px]" />
          <FilterSelect label="Status" allLabel="All statuses" value={status} onChange={setStatus} options={Object.entries(PO_STATUS).map(([value, t]) => ({ value, label: t.label }))} className="w-full sm:w-[180px]" />
          <FilterSelect label="Vendor" allLabel="All vendors" value={vendor} onChange={setVendor} options={(vendors ?? []).map((v) => ({ value: v.id, label: v.name }))} className="w-full sm:w-[190px]" />
          <FilterSelect label="Warehouse" allLabel="All warehouses" value={warehouse} onChange={setWarehouse} options={(warehouses ?? []).map((w) => ({ value: w.id, label: w.name }))} className="w-full sm:w-[170px]" />
          <DateRange from={dates.from} to={dates.to} onChange={(f, t) => setDates({ from: f, to: t })} label="Order date" />
        </ListToolbar>
        <DataTable
          rows={rows}
          columns={poColumns({ vendors, warehouses })}
          rowKey={(p) => p.id}
          onRowClick={(p) => router.push(recordHref("purchaseOrders", p.id))}
          caption="Purchase orders"
          noun="purchase orders"
          defaultSort={{ key: "orderDate", dir: "desc" }}
          resetKey={`${q}|${status}|${vendor}|${warehouse}|${dates.from}|${dates.to}`}
          empty={<EmptyState icon={ShoppingCartIcon} title={filtered ? "No purchase orders match" : "No purchase orders yet"} hint={filtered ? "Try different filters." : "Create one, or raise it from Reorder Alerts."} />}
        />
      </Card>
      <PrototypeNote className="mt-4">Purchase orders are demo records. Creating, approving or confirming an order doesn&apos;t send anything to the vendor and never increases stock.</PrototypeNote>
    </PageShell>
  );
}
