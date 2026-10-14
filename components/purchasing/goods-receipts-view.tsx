"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircleIcon, FileDashedIcon, PlusIcon, TrayArrowDownIcon, XCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { DataTable, DateRange, inRange, ListToolbar, matches, type Column } from "@/components/shared/data-table";
import { PrimaryLink, PrototypeNote, StatRow, StatTile, TextLink } from "@/components/shared/doc-ui";
import { Card, FilterSelect, PageHeading, PageShell, SearchInput, ToneBadge } from "@/components/shared/inventory-ui";
import { EmptyState } from "@/components/shared/state-panels";
import { useRecords } from "@/hooks/use-operations";
import { warehouseLabel } from "@/lib/derive";
import { addDays, formatDate, formatNumber, toIsoDate } from "@/lib/format";
import { RECEIPT_STATUS } from "@/lib/operations-meta";
import { newHref, recordHref } from "@/lib/routes";
import type { GoodsReceipt } from "@/lib/types/operations";
import { vendorLabel } from "./po-columns";

export const accepted = (g: GoodsReceipt) => g.lines.reduce((s, l) => s + (l.received - l.rejected), 0);
export const rejected = (g: GoodsReceipt) => g.lines.reduce((s, l) => s + l.rejected, 0);

export function GoodsReceiptsView() {
  const router = useRouter();
  const { data: receipts } = useRecords("goodsReceipts");
  const { data: pos } = useRecords("purchaseOrders");
  const { data: vendors } = useRecords("vendors");
  const { data: warehouses } = useRecords("warehouses");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [vendor, setVendor] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [dates, setDates] = useState({ from: "", to: "" });
  const poNumber = useMemo(() => new Map((pos ?? []).map((p) => [p.id, p.number])), [pos]);
  const since = addDays(toIsoDate(new Date()), -30);

  const rows = useMemo(
    () =>
      receipts?.filter(
        (g) =>
          (!status || g.status === status) &&
          (!vendor || g.vendorId === vendor) &&
          (!warehouse || g.warehouseId === warehouse) &&
          inRange(g.receivedDate, dates.from, dates.to) &&
          matches(q, g.number, poNumber.get(g.poId), vendorLabel(vendors, g.vendorId)),
      ),
    [receipts, status, vendor, warehouse, dates, q, poNumber, vendors],
  );
  const filtered = !!(q || status || vendor || warehouse || dates.from || dates.to);
  const recent = receipts?.filter((g) => g.status !== "draft" && g.receivedDate >= since);

  const columns: Column<GoodsReceipt>[] = [
    {
      key: "number",
      header: "Receipt",
      sortValue: (g) => g.number,
      cell: (g) => (
        <TextLink href={recordHref("goodsReceipts", g.id)} className="font-mono text-[12.5px] font-semibold whitespace-nowrap">
          {g.number}
        </TextLink>
      ),
    },
    {
      key: "po",
      header: "Purchase order",
      sortValue: (g) => poNumber.get(g.poId) ?? "",
      cell: (g) => (
        <TextLink href={recordHref("purchaseOrders", g.poId)} className="font-mono text-[12.5px] font-normal whitespace-nowrap">
          {poNumber.get(g.poId) ?? "—"}
        </TextLink>
      ),
    },
    { key: "vendor", header: "Vendor", sortValue: (g) => vendorLabel(vendors, g.vendorId), cell: (g) => <span className="whitespace-nowrap">{vendorLabel(vendors, g.vendorId)}</span> },
    { key: "warehouse", header: "Warehouse", sortValue: (g) => warehouseLabel(warehouses, g.warehouseId), cell: (g) => <span className="whitespace-nowrap">{warehouseLabel(warehouses, g.warehouseId)}</span> },
    { key: "date", header: "Received", sortValue: (g) => g.receivedDate, cell: (g) => <span className="whitespace-nowrap">{formatDate(g.receivedDate)}</span> },
    { key: "accepted", header: "Accepted", align: "right", sortValue: accepted, cell: (g) => <span className="font-semibold text-ink">{formatNumber(accepted(g))}</span> },
    { key: "rejected", header: "Rejected", align: "right", sortValue: rejected, cell: (g) => (rejected(g) ? <span className="font-medium text-[var(--danger)]">{formatNumber(rejected(g))}</span> : <span className="text-ink-muted">0</span>) },
    { key: "status", header: "Status", sortValue: (g) => g.status, cell: (g) => <ToneBadge tone={RECEIPT_STATUS[g.status]} /> },
  ];

  return (
    <PageShell>
      <PageHeading
        crumbs={[{ label: "Purchasing" }, { label: "Goods Receipts" }]}
        title="Goods Receipts"
        description="What arrived against each purchase order, including partial and rejected quantities."
        actions={
          <PrimaryLink href={newHref("goodsReceipts")} icon={PlusIcon}>
            New Receipt
          </PrimaryLink>
        }
      />
      <StatRow>
        <StatTile label="Draft receipts" value={receipts?.filter((g) => g.status === "draft").length} icon={FileDashedIcon} tone="coral" />
        <StatTile label="Receipts (last 30 days)" value={recent?.length} icon={TrayArrowDownIcon} tone="brand" />
        <StatTile label="Units accepted (30 days)" value={recent ? formatNumber(recent.reduce((s, g) => s + accepted(g), 0)) : undefined} icon={CheckCircleIcon} />
        <StatTile label="Units rejected (30 days)" value={recent ? formatNumber(recent.reduce((s, g) => s + rejected(g), 0)) : undefined} icon={XCircleIcon} />
      </StatRow>
      <Card className="mt-4" label="Goods receipts">
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
          <SearchInput value={q} onChange={setQ} placeholder="Search receipt, PO or vendor…" label="Search goods receipts" className="w-full sm:w-[260px]" />
          <FilterSelect label="Status" allLabel="All statuses" value={status} onChange={setStatus} options={Object.entries(RECEIPT_STATUS).map(([value, t]) => ({ value, label: t.label }))} className="w-full sm:w-[170px]" />
          <FilterSelect label="Vendor" allLabel="All vendors" value={vendor} onChange={setVendor} options={(vendors ?? []).map((v) => ({ value: v.id, label: v.name }))} className="w-full sm:w-[190px]" />
          <FilterSelect label="Warehouse" allLabel="All warehouses" value={warehouse} onChange={setWarehouse} options={(warehouses ?? []).map((w) => ({ value: w.id, label: w.name }))} className="w-full sm:w-[170px]" />
          <DateRange from={dates.from} to={dates.to} onChange={(f, t) => setDates({ from: f, to: t })} label="Received" />
        </ListToolbar>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(g) => g.id}
          onRowClick={(g) => router.push(recordHref("goodsReceipts", g.id))}
          caption="Goods receipts"
          noun="receipts"
          defaultSort={{ key: "date", dir: "desc" }}
          resetKey={`${q}|${status}|${vendor}|${warehouse}|${dates.from}|${dates.to}`}
          empty={<EmptyState icon={TrayArrowDownIcon} title={filtered ? "No receipts match" : "No receipts yet"} hint={filtered ? "Try different filters." : "Record a receipt from a confirmed purchase order."} />}
        />
      </Card>
      <PrototypeNote className="mt-4">Received and partially received rows are the seeded history (they match GRN entries in Stock Movement History). New receipts are saved as drafts only — they never post stock movements.</PrototypeNote>
    </PageShell>
  );
}
