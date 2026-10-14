"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUUpLeftIcon, ClipboardTextIcon, PackageIcon, PlusIcon } from "@phosphor-icons/react/dist/ssr";
import { DataTable, DateRange, inRange, ListToolbar, matches, type Column } from "@/components/shared/data-table";
import { PrimaryLink, PrototypeNote, StatRow, StatTile, TextLink } from "@/components/shared/doc-ui";
import { Card, FilterSelect, PageHeading, PageShell, SearchInput, ToneBadge } from "@/components/shared/inventory-ui";
import { EmptyState } from "@/components/shared/state-panels";
import { useProducts, useRecords } from "@/hooks/use-operations";
import { formatDate, formatNumber } from "@/lib/format";
import { RETURN_OUTCOME, RETURN_STATUS } from "@/lib/operations-meta";
import { newHref, recordHref } from "@/lib/routes";
import type { SalesReturn } from "@/lib/types/operations";
import { customerLabel } from "./so-columns";

const qtyOf = (r: SalesReturn) => r.lines.reduce((s, l) => s + l.quantity, 0);
const outcomes = (r: SalesReturn) => [...new Set(r.lines.map((l) => l.outcome).filter(Boolean))] as (keyof typeof RETURN_OUTCOME)[];

export function ReturnsView() {
  const router = useRouter();
  const { data: returns } = useRecords("salesReturns");
  const { data: sos } = useRecords("salesOrders");
  const { data: customers } = useRecords("customers");
  const { data: products } = useProducts();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [outcome, setOutcome] = useState("");
  const [dates, setDates] = useState({ from: "", to: "" });
  const soNumber = useMemo(() => new Map((sos ?? []).map((s) => [s.id, s.number])), [sos]);
  const names = useMemo(() => new Map((products ?? []).map((p) => [p.id, p.name])), [products]);

  const rows = useMemo(
    () =>
      returns?.filter(
        (r) =>
          (!status || r.status === status) &&
          (!outcome || r.lines.some((l) => l.outcome === outcome)) &&
          inRange(r.requestedDate, dates.from, dates.to) &&
          matches(q, r.number, soNumber.get(r.soId), customerLabel(customers, r.customerId), ...r.lines.map((l) => names.get(l.productId))),
      ),
    [returns, status, outcome, dates, q, soNumber, customers, names],
  );
  const filtered = !!(q || status || outcome || dates.from || dates.to);

  const columns: Column<SalesReturn>[] = [
    {
      key: "number",
      header: "Return",
      sortValue: (r) => r.number,
      cell: (r) => (
        <TextLink href={recordHref("salesReturns", r.id)} className="font-mono text-[12.5px] font-semibold whitespace-nowrap">
          {r.number}
        </TextLink>
      ),
    },
    {
      key: "so",
      header: "Original order",
      sortValue: (r) => soNumber.get(r.soId) ?? "",
      cell: (r) => (
        <TextLink href={recordHref("salesOrders", r.soId)} className="font-mono text-[12.5px] font-normal">
          {soNumber.get(r.soId) ?? "—"}
        </TextLink>
      ),
    },
    { key: "customer", header: "Customer", sortValue: (r) => customerLabel(customers, r.customerId), cell: (r) => <span className="whitespace-nowrap">{customerLabel(customers, r.customerId)}</span> },
    {
      key: "items",
      header: "Returned items",
      cell: (r) => (
        <span className="block max-w-[220px] truncate">
          {r.lines.map((l) => names.get(l.productId)).join(", ")}
        </span>
      ),
    },
    { key: "qty", header: "Qty", align: "right", sortValue: qtyOf, cell: (r) => formatNumber(qtyOf(r)) },
    { key: "reason", header: "Reason", sortValue: (r) => r.lines[0]?.reason ?? "", cell: (r) => <span className="whitespace-nowrap">{r.lines.length > 1 ? "Multiple" : r.lines[0]?.reason}</span> },
    {
      key: "outcome",
      header: "Inspection outcome",
      cell: (r) => (outcomes(r).length ? <span className="flex flex-wrap gap-1">{outcomes(r).map((o) => <ToneBadge key={o} tone={RETURN_OUTCOME[o]} />)}</span> : <span className="text-ink-muted">Pending</span>),
    },
    { key: "date", header: "Requested", sortValue: (r) => r.requestedDate, cell: (r) => <span className="whitespace-nowrap">{formatDate(r.requestedDate)}</span> },
    { key: "status", header: "Status", sortValue: (r) => r.status, cell: (r) => <ToneBadge tone={RETURN_STATUS[r.status]} /> },
  ];

  return (
    <PageShell>
      <PageHeading
        crumbs={[{ label: "Sales & Fulfilment" }, { label: "Sales Returns" }]}
        title="Sales Returns"
        description="Goods customers send back, why, and what happens to them after inspection."
        actions={
          <PrimaryLink href={newHref("salesReturns")} icon={PlusIcon}>
            New Return
          </PrimaryLink>
        }
      />
      <StatRow>
        <StatTile label="Awaiting arrival" value={returns?.filter((r) => r.status === "requested").length} icon={ArrowUUpLeftIcon} tone="coral" />
        <StatTile label="To inspect" value={returns?.filter((r) => r.status === "received").length} icon={ClipboardTextIcon} />
        <StatTile label="Inspected" value={returns?.filter((r) => r.status === "inspected").length} icon={PackageIcon} tone="brand" />
        <StatTile label="Closed" value={returns?.filter((r) => r.status === "closed").length} />
      </StatRow>
      <Card className="mt-4" label="Sales returns">
        <ListToolbar
          canClear={filtered}
          onClear={() => {
            setQ("");
            setStatus("");
            setOutcome("");
            setDates({ from: "", to: "" });
          }}
        >
          <SearchInput value={q} onChange={setQ} placeholder="Search return, order, customer or item…" label="Search returns" className="w-full sm:w-[280px]" />
          <FilterSelect label="Status" allLabel="All statuses" value={status} onChange={setStatus} options={Object.entries(RETURN_STATUS).map(([value, t]) => ({ value, label: t.label }))} className="w-full sm:w-[160px]" />
          <FilterSelect label="Outcome" allLabel="All outcomes" value={outcome} onChange={setOutcome} options={Object.entries(RETURN_OUTCOME).map(([value, t]) => ({ value, label: t.label }))} className="w-full sm:w-[160px]" />
          <DateRange from={dates.from} to={dates.to} onChange={(f, t) => setDates({ from: f, to: t })} label="Requested" />
        </ListToolbar>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(r) => r.id}
          onRowClick={(r) => router.push(recordHref("salesReturns", r.id))}
          caption="Sales returns"
          noun="returns"
          minWidth={1100}
          defaultSort={{ key: "date", dir: "desc" }}
          resetKey={`${q}|${status}|${outcome}|${dates.from}|${dates.to}`}
          empty={<EmptyState icon={ArrowUUpLeftIcon} title={filtered ? "No returns match" : "No returns yet"} hint={filtered ? "Try different filters." : "Create a return from a fulfilled sales order."} />}
        />
      </Card>
      <PrototypeNote className="mt-4">Return outcomes (Restock, Quarantine, Write-off) are recorded for review only. They don&apos;t change inventory balances in this prototype.</PrototypeNote>
    </PageShell>
  );
}
