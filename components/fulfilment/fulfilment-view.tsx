"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TruckIcon } from "@phosphor-icons/react/dist/ssr";
import { customerLabel } from "@/components/sales/so-columns";
import { DataTable, ListToolbar, matches, type Column } from "@/components/shared/data-table";
import { PrototypeNote, TextLink } from "@/components/shared/doc-ui";
import { Card, FilterSelect, PageHeading, PageShell, SearchInput, ToneBadge, UnderlineTabs } from "@/components/shared/inventory-ui";
import { EmptyState } from "@/components/shared/state-panels";
import { useRecords } from "@/hooks/use-operations";
import { warehouseLabel } from "@/lib/derive";
import { formatDate, formatNumber } from "@/lib/format";
import { CARRIERS, FULFILMENT_FLOW, FULFILMENT_STAGE } from "@/lib/operations-meta";
import { recordHref } from "@/lib/routes";
import type { Fulfilment, FulfilmentStage, SalesOrder } from "@/lib/types/operations";

type Row = Fulfilment & { so: SalesOrder };

export function FulfilmentView() {
  const router = useRouter();
  const { data: fulfilments } = useRecords("fulfilments");
  const { data: sos } = useRecords("salesOrders");
  const { data: customers } = useRecords("customers");
  const { data: warehouses } = useRecords("warehouses");
  const [stage, setStage] = useState<FulfilmentStage>("to-pick");
  const [q, setQ] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [carrier, setCarrier] = useState("");

  // Orders cancelled after joining the queue drop out of it.
  const all: Row[] | undefined = useMemo(() => {
    if (!fulfilments || !sos) return undefined;
    const byId = new Map(sos.map((s) => [s.id, s]));
    return fulfilments.flatMap((f) => {
      const so = byId.get(f.soId);
      return so && so.status !== "cancelled" ? [{ ...f, so }] : [];
    });
  }, [fulfilments, sos]);
  const rows = useMemo(
    () => all?.filter((f) => f.stage === stage && (!warehouse || f.so.warehouseId === warehouse) && (!carrier || f.carrier === carrier) && matches(q, f.so.number, customerLabel(customers, f.so.customerId), f.tracking)),
    [all, stage, warehouse, carrier, q, customers],
  );
  const count = (s: FulfilmentStage) => all?.filter((f) => f.stage === s).length;
  const filtered = !!(q || warehouse || carrier);

  const columns: Column<Row>[] = [
    {
      key: "so",
      header: "Sales order",
      sortValue: (f) => f.so.number,
      cell: (f) => (
        <TextLink href={recordHref("fulfilment", f.id)} className="font-mono text-[12.5px] font-semibold whitespace-nowrap">
          {f.so.number}
        </TextLink>
      ),
    },
    { key: "customer", header: "Customer", sortValue: (f) => customerLabel(customers, f.so.customerId), cell: (f) => <span className="whitespace-nowrap">{customerLabel(customers, f.so.customerId)}</span> },
    { key: "warehouse", header: "Warehouse", sortValue: (f) => warehouseLabel(warehouses, f.so.warehouseId), cell: (f) => <span className="whitespace-nowrap">{warehouseLabel(warehouses, f.so.warehouseId)}</span> },
    { key: "items", header: "Items to pick", align: "right", sortValue: (f) => f.lines.length, cell: (f) => `${f.lines.length} · ${formatNumber(f.lines.reduce((s, l) => s + l.ordered, 0))} units` },
    {
      key: "picked",
      header: "Picked / ordered",
      align: "right",
      sortValue: (f) => f.lines.reduce((s, l) => s + l.picked, 0) / Math.max(1, f.lines.reduce((s, l) => s + l.ordered, 0)),
      cell: (f) => (
        <span className="whitespace-nowrap">
          {formatNumber(f.lines.reduce((s, l) => s + l.picked, 0))} / {formatNumber(f.lines.reduce((s, l) => s + l.ordered, 0))}
        </span>
      ),
    },
    { key: "stage", header: "Packing status", sortValue: (f) => FULFILMENT_FLOW.indexOf(f.stage), cell: (f) => <ToneBadge tone={FULFILMENT_STAGE[f.stage]} /> },
    {
      key: "shipment",
      header: "Shipment",
      sortValue: (f) => f.carrier,
      cell: (f) =>
        f.carrier ? (
          <span className="block whitespace-nowrap">
            <span className="block">{f.carrier}</span>
            <span className="block font-mono text-[12px] leading-4 text-ink-muted">{f.tracking || "No tracking no."}</span>
          </span>
        ) : (
          <span className="text-ink-muted">—</span>
        ),
    },
    { key: "delivery", header: "Delivery date", sortValue: (f) => f.so.deliveryDate, cell: (f) => <span className="whitespace-nowrap">{formatDate(f.so.deliveryDate)}</span> },
  ];

  return (
    <PageShell>
      <PageHeading crumbs={[{ label: "Sales & Fulfilment" }, { label: "Pick, Pack & Ship" }]} title="Pick, Pack & Ship" description="Work through confirmed orders: pick the items, pack them and record the shipment." />
      <PrototypeNote className="mt-5">Pick, pack and dispatch controls change demo statuses only. Carrier booking and shipment creation aren&apos;t connected, and marking an order dispatched doesn&apos;t mean goods have shipped or stock has left the warehouse.</PrototypeNote>
      <Card className="mt-4" label="Fulfilment queue">
        <UnderlineTabs idPrefix="ful" label="Fulfilment stage" value={stage} onChange={setStage} className="px-5 pt-3" tabs={FULFILMENT_FLOW.map((s) => ({ value: s, label: FULFILMENT_STAGE[s].label, count: count(s) }))} />
        <div id={`ful-panel-${stage}`} role="tabpanel" aria-labelledby={`ful-tab-${stage}`}>
          <ListToolbar
            canClear={filtered}
            onClear={() => {
              setQ("");
              setWarehouse("");
              setCarrier("");
            }}
          >
            <SearchInput value={q} onChange={setQ} placeholder="Search order, customer or tracking no…" label="Search fulfilment queue" className="w-full sm:w-[280px]" />
            <FilterSelect label="Warehouse" allLabel="All warehouses" value={warehouse} onChange={setWarehouse} options={(warehouses ?? []).map((w) => ({ value: w.id, label: w.name }))} className="w-full sm:w-[170px]" />
            <FilterSelect label="Carrier" allLabel="All carriers" value={carrier} onChange={setCarrier} options={CARRIERS.map((c) => ({ value: c, label: c }))} className="w-full sm:w-[150px]" />
          </ListToolbar>
          <DataTable
            rows={rows}
            columns={columns}
            rowKey={(f) => f.id}
            onRowClick={(f) => router.push(recordHref("fulfilment", f.id))}
            caption={`Orders at stage ${FULFILMENT_STAGE[stage].label}`}
            noun="orders"
            defaultSort={{ key: "delivery", dir: stage === "dispatched" ? "desc" : "asc" }}
            resetKey={`${stage}|${q}|${warehouse}|${carrier}`}
            empty={<EmptyState icon={TruckIcon} title={filtered ? "No orders match" : `Nothing at “${FULFILMENT_STAGE[stage].label}”`} hint={filtered ? "Try different filters." : "Confirmed sales orders appear in To Pick."} />}
          />
        </div>
      </Card>
    </PageShell>
  );
}
