"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowsLeftRightIcon, CheckCircleIcon, ClockIcon, PlusIcon, TruckIcon } from "@phosphor-icons/react/dist/ssr";
import { DataTable, DateRange, inRange, ListToolbar, matches, type Column } from "@/components/shared/data-table";
import { PrimaryLink, PrototypeNote, StatRow, StatTile, TextLink } from "@/components/shared/doc-ui";
import { Card, FilterSelect, PageHeading, PageShell, SearchInput, ToneBadge } from "@/components/shared/inventory-ui";
import { EmptyState } from "@/components/shared/state-panels";
import { useProducts, useRecords } from "@/hooks/use-operations";
import { warehouseLabel } from "@/lib/derive";
import { formatDate, formatNumber } from "@/lib/format";
import { TRANSFER_STATUS } from "@/lib/operations-meta";
import { newHref, recordHref } from "@/lib/routes";
import type { StockTransfer } from "@/lib/types/operations";

export function TransfersView() {
  const router = useRouter();
  const { data: transfers } = useRecords("transfers");
  const { data: warehouses } = useRecords("warehouses");
  const { data: products } = useProducts();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [dates, setDates] = useState({ from: "", to: "" });
  const names = useMemo(() => new Map((products ?? []).map((p) => [p.id, `${p.name} ${p.sku}`])), [products]);

  const rows = useMemo(
    () =>
      transfers?.filter(
        (t) => (!status || t.status === status) && (!from || t.from === from) && (!to || t.to === to) && inRange(t.createdDate, dates.from, dates.to) && matches(q, t.number, ...t.lines.map((l) => names.get(l.productId))),
      ),
    [transfers, status, from, to, dates, q, names],
  );
  const filtered = !!(q || status || from || to || dates.from || dates.to);
  const whOptions = (warehouses ?? []).map((w) => ({ value: w.id, label: w.name }));
  const countOf = (...s: StockTransfer["status"][]) => transfers?.filter((t) => s.includes(t.status)).length;

  const columns: Column<StockTransfer>[] = [
    {
      key: "number",
      header: "Reference",
      sortValue: (t) => t.number,
      cell: (t) => (
        <TextLink href={recordHref("transfers", t.id)} className="font-mono text-[12.5px] font-semibold whitespace-nowrap">
          {t.number}
        </TextLink>
      ),
    },
    {
      key: "route",
      header: "From → To",
      sortValue: (t) => warehouseLabel(warehouses, t.from),
      cell: (t) => (
        <span className="whitespace-nowrap">
          {warehouseLabel(warehouses, t.from)} <span className="text-ink-faint">→</span> {warehouseLabel(warehouses, t.to)}
        </span>
      ),
    },
    { key: "products", header: "Products", align: "right", sortValue: (t) => t.lines.length, cell: (t) => formatNumber(t.lines.length) },
    { key: "qty", header: "Total qty", align: "right", sortValue: (t) => t.lines.reduce((s, l) => s + l.quantity, 0), cell: (t) => <span className="font-semibold text-ink">{formatNumber(t.lines.reduce((s, l) => s + l.quantity, 0))}</span> },
    { key: "created", header: "Created", sortValue: (t) => t.createdDate, cell: (t) => <span className="whitespace-nowrap">{formatDate(t.createdDate)}</span> },
    { key: "expected", header: "Expected", sortValue: (t) => t.expectedDate, cell: (t) => <span className="whitespace-nowrap">{formatDate(t.expectedDate)}</span> },
    { key: "by", header: "Created by", sortValue: (t) => t.createdBy, cell: (t) => <span className="whitespace-nowrap">{t.createdBy}</span> },
    { key: "status", header: "Status", sortValue: (t) => t.status, cell: (t) => <ToneBadge tone={TRANSFER_STATUS[t.status]} /> },
  ];

  return (
    <PageShell>
      <PageHeading
        crumbs={[{ label: "Inventory" }, { label: "Stock Transfers" }]}
        title="Stock Transfers"
        description="Move stock between warehouses: request, approve, dispatch and receive."
        actions={
          <PrimaryLink href={newHref("transfers")} icon={PlusIcon}>
            New Transfer
          </PrimaryLink>
        }
      />
      <StatRow>
        <StatTile label="Awaiting approval" value={countOf("draft", "submitted")} icon={ClockIcon} tone="coral" />
        <StatTile label="Approved" value={countOf("approved")} icon={CheckCircleIcon} />
        <StatTile label="In transit" value={countOf("in-transit")} icon={TruckIcon} tone="brand" />
        <StatTile label="Received (last 45 days)" value={countOf("received")} icon={ArrowsLeftRightIcon} />
      </StatRow>
      <Card className="mt-4" label="Transfers">
        <ListToolbar
          canClear={filtered}
          onClear={() => {
            setQ("");
            setStatus("");
            setFrom("");
            setTo("");
            setDates({ from: "", to: "" });
          }}
        >
          <SearchInput value={q} onChange={setQ} placeholder="Search reference or product…" label="Search transfers" className="w-full sm:w-[260px]" />
          <FilterSelect label="Status" allLabel="All statuses" value={status} onChange={setStatus} options={Object.entries(TRANSFER_STATUS).map(([value, t]) => ({ value, label: t.label }))} className="w-full sm:w-[160px]" />
          <FilterSelect label="From warehouse" allLabel="From: any" value={from} onChange={setFrom} options={whOptions} className="w-full sm:w-[170px]" />
          <FilterSelect label="To warehouse" allLabel="To: any" value={to} onChange={setTo} options={whOptions} className="w-full sm:w-[170px]" />
          <DateRange from={dates.from} to={dates.to} onChange={(f, t) => setDates({ from: f, to: t })} label="Created" />
        </ListToolbar>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(t) => t.id}
          onRowClick={(t) => router.push(recordHref("transfers", t.id))}
          caption="Stock transfers"
          noun="transfers"
          defaultSort={{ key: "created", dir: "desc" }}
          resetKey={`${q}|${status}|${from}|${to}|${dates.from}|${dates.to}`}
          empty={<EmptyState icon={ArrowsLeftRightIcon} title={filtered ? "No transfers match" : "No transfers yet"} hint={filtered ? "Try different filters." : "Create a transfer to request stock for another warehouse."} />}
        />
      </Card>
      <PrototypeNote className="mt-4">Transfers here are demo records. Changing their status never changes stock balances; received transfers in the list mirror TRF entries in Stock Movement History.</PrototypeNote>
    </PageShell>
  );
}
