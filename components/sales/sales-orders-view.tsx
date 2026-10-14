"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarIcon, FileDashedIcon, PlusIcon, ShoppingBagIcon, TruckIcon } from "@phosphor-icons/react/dist/ssr";
import { DataTable, DateRange, inRange, ListToolbar, matches } from "@/components/shared/data-table";
import { PrimaryLink, PrototypeNote, StatRow, StatTile } from "@/components/shared/doc-ui";
import { Card, FilterSelect, PageHeading, PageShell, SearchInput } from "@/components/shared/inventory-ui";
import { EmptyState } from "@/components/shared/state-panels";
import { useProducts, useRecords } from "@/hooks/use-operations";
import { addDays, formatCurrency, formatNumber, toIsoDate } from "@/lib/format";
import { SO_STATUS } from "@/lib/operations-meta";
import { newHref, recordHref } from "@/lib/routes";
import { customerLabel, soColumns, soTotal } from "./so-columns";

export function SalesOrdersView({ initialStatus = "" }: { initialStatus?: string }) {
  const router = useRouter();
  const { data: sos } = useRecords("salesOrders");
  const { data: customers } = useRecords("customers");
  const { data: warehouses } = useRecords("warehouses");
  const { data: products } = useProducts();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(SO_STATUS[initialStatus as keyof typeof SO_STATUS] ? initialStatus : "");
  const [customer, setCustomer] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [dates, setDates] = useState({ from: "", to: "" });
  const names = useMemo(() => new Map((products ?? []).map((p) => [p.id, `${p.name} ${p.sku}`])), [products]);
  const today = toIsoDate(new Date());

  const rows = useMemo(
    () =>
      sos?.filter(
        (s) =>
          (!status || s.status === status) &&
          (!customer || s.customerId === customer) &&
          (!warehouse || s.warehouseId === warehouse) &&
          inRange(s.orderDate, dates.from, dates.to) &&
          matches(q, s.number, customerLabel(customers, s.customerId), ...s.lines.map((l) => names.get(l.productId))),
      ),
    [sos, status, customer, warehouse, dates, q, customers, names],
  );
  const filtered = !!(q || status || customer || warehouse || dates.from || dates.to);
  const open = sos?.filter((s) => s.status === "confirmed" || s.status === "partially-fulfilled");

  return (
    <PageShell>
      <PageHeading
        crumbs={[{ label: "Sales & Fulfilment" }, { label: "Sales Orders" }]}
        title="Sales Orders"
        description="Customer orders, from draft through confirmation to fulfilment."
        actions={
          <PrimaryLink href={newHref("salesOrders")} icon={PlusIcon}>
            New Sales Order
          </PrimaryLink>
        }
      />
      <StatRow>
        <StatTile label="Open orders" value={open ? formatNumber(open.length) : undefined} note={open ? formatCurrency(open.reduce((s, o) => s + soTotal(o), 0)) : undefined} icon={ShoppingBagIcon} tone="brand" />
        <StatTile label="Drafts" value={sos?.filter((s) => s.status === "draft").length} icon={FileDashedIcon} />
        <StatTile label="Due in the next 7 days" value={open?.filter((s) => s.deliveryDate >= today && s.deliveryDate <= addDays(today, 7)).length} icon={CalendarIcon} />
        <StatTile label="Past requested date" value={open?.filter((s) => s.deliveryDate < today).length} icon={TruckIcon} tone="coral" />
      </StatRow>
      <Card className="mt-4" label="Sales orders">
        <ListToolbar
          canClear={filtered}
          onClear={() => {
            setQ("");
            setStatus("");
            setCustomer("");
            setWarehouse("");
            setDates({ from: "", to: "" });
          }}
        >
          <SearchInput value={q} onChange={setQ} placeholder="Search SO number, customer or product…" label="Search sales orders" className="w-full sm:w-[280px]" />
          <FilterSelect label="Fulfilment status" allLabel="All statuses" value={status} onChange={setStatus} options={Object.entries(SO_STATUS).map(([value, t]) => ({ value, label: t.label }))} className="w-full sm:w-[180px]" />
          <FilterSelect label="Customer" allLabel="All customers" value={customer} onChange={setCustomer} options={(customers ?? []).map((c) => ({ value: c.id, label: c.name }))} className="w-full sm:w-[190px]" />
          <FilterSelect label="Warehouse" allLabel="All warehouses" value={warehouse} onChange={setWarehouse} options={(warehouses ?? []).map((w) => ({ value: w.id, label: w.name }))} className="w-full sm:w-[170px]" />
          <DateRange from={dates.from} to={dates.to} onChange={(f, t) => setDates({ from: f, to: t })} label="Order date" />
        </ListToolbar>
        <DataTable
          rows={rows}
          columns={soColumns({ customers, warehouses })}
          rowKey={(s) => s.id}
          onRowClick={(s) => router.push(recordHref("salesOrders", s.id))}
          caption="Sales orders"
          noun="sales orders"
          defaultSort={{ key: "orderDate", dir: "desc" }}
          resetKey={`${q}|${status}|${customer}|${warehouse}|${dates.from}|${dates.to}`}
          empty={<EmptyState icon={ShoppingBagIcon} title={filtered ? "No sales orders match" : "No sales orders yet"} hint={filtered ? "Try different filters." : "Create your first sales order."} />}
        />
      </Card>
      <PrototypeNote className="mt-4">Sales orders are demo records. Fulfilled orders mirror SO issues in Stock Movement History; new orders never reserve or dispatch stock.</PrototypeNote>
    </PageShell>
  );
}
