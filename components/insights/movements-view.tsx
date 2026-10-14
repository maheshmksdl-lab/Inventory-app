"use client";

import { useMemo, useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, ArrowsLeftRightIcon, ClockCounterClockwiseIcon, DownloadSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { DataTable, DateRange, inRange, ListToolbar, matches, sortRows, type Column, type SortState } from "@/components/shared/data-table";
import { PrototypeNote, StatRow, StatTile, TextLink } from "@/components/shared/doc-ui";
import { Card, FilterSelect, OutlineButton, PageHeading, PageShell, SearchInput, ToneBadge } from "@/components/shared/inventory-ui";
import { ProductThumb } from "@/components/shared/product-thumb";
import { EmptyState } from "@/components/shared/state-panels";
import { useLedger, useProducts, useRecords } from "@/hooks/use-operations";
import { downloadCsv } from "@/lib/csv";
import { warehouseLabel } from "@/lib/derive";
import { formatDate, formatNumber, formatSigned, formatTime, pluralize, toIsoDate } from "@/lib/format";
import { MOVEMENT_META } from "@/lib/inventory-meta";
import { itemHref, recordHref, type ModuleKey } from "@/lib/routes";
import type { ProductRow, StockMovement } from "@/lib/types/inventory";
import { cn } from "@/lib/utils";

const PREFIX_MODULE: Record<string, ModuleKey> = { GRN: "goodsReceipts", SO: "salesOrders", TRF: "transfers" };

/**
 * The same ledger the Dashboard and Item Details read. References open the
 * matching document where one exists in the demo store.
 */
export function MovementsView({ initialQuery = "" }: { initialQuery?: string }) {
  const { data: ledger } = useLedger();
  const { data: products } = useProducts();
  const { data: warehouses } = useRecords("warehouses");
  const { data: receipts } = useRecords("goodsReceipts");
  const { data: sos } = useRecords("salesOrders");
  const { data: transfers } = useRecords("transfers");
  const [q, setQ] = useState(initialQuery);
  const [type, setType] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [dates, setDates] = useState({ from: "", to: "" });
  const [sort, setSort] = useState<SortState | null>({ key: "at", dir: "desc" });
  const byId = useMemo(() => new Map((products ?? []).map((p) => [p.id, p])), [products]);
  const docIds = useMemo(() => new Set([...(receipts ?? []), ...(sos ?? []), ...(transfers ?? [])].map((d) => d.id)), [receipts, sos, transfers]);

  const refHref = (ref: string) => {
    const mod = PREFIX_MODULE[ref.split("-")[0]];
    return mod && docIds.has(ref.toLowerCase()) ? recordHref(mod, ref.toLowerCase()) : null;
  };

  const rows = useMemo(
    () =>
      ledger?.filter((m) => {
        const p = byId.get(m.productId);
        return (!type || m.type === type) && (!warehouse || m.from === warehouse || m.to === warehouse) && inRange(m.at, dates.from, dates.to) && matches(q, m.reference, p?.name, p?.sku, m.user);
      }),
    [ledger, byId, type, warehouse, dates, q],
  );
  const filtered = !!(q || type || warehouse || dates.from || dates.to);
  const sumType = (t: StockMovement["type"]) => rows?.filter((m) => m.type === t).reduce((s, m) => s + m.quantity, 0);

  const columns: Column<StockMovement>[] = [
    {
      key: "at",
      header: "Date & time",
      sortValue: (m) => m.at,
      cell: (m) => (
        <span className="block whitespace-nowrap">
          <span className="block text-ink">{formatDate(m.at)}</span>
          <span className="block text-[12px] leading-4 text-ink-muted">{formatTime(m.at)}</span>
        </span>
      ),
    },
    {
      key: "ref",
      header: "Reference",
      sortValue: (m) => m.reference,
      cell: (m) => {
        const href = refHref(m.reference);
        return href ? (
          <TextLink href={href} className="font-mono text-[12.5px] whitespace-nowrap">
            {m.reference}
          </TextLink>
        ) : (
          <span className="font-mono text-[12.5px] whitespace-nowrap text-ink">{m.reference}</span>
        );
      },
    },
    {
      key: "product",
      header: "Product",
      sortValue: (m) => byId.get(m.productId)?.name ?? "",
      cell: (m) => {
        const p = byId.get(m.productId);
        return (
          <span className="flex min-w-[190px] items-center gap-2.5">
            {p && <ProductThumb icon={p.icon} size={28} />}
            <TextLink href={itemHref(m.productId)} className="truncate">
              {p?.name ?? m.productId}
            </TextLink>
          </span>
        );
      },
    },
    { key: "sku", header: "SKU", sortValue: (m) => byId.get(m.productId)?.sku ?? "", cell: (m) => <span className="font-mono text-[12px] whitespace-nowrap">{byId.get(m.productId)?.sku}</span> },
    { key: "type", header: "Transaction type", sortValue: (m) => m.type, cell: (m) => <ToneBadge tone={MOVEMENT_META[m.type]} /> },
    {
      key: "qty",
      header: "Qty change",
      align: "right",
      sortValue: (m) => m.quantity,
      cell: (m) => (m.type === "transfer" ? <span className="text-ink-body">{formatNumber(m.quantity)}</span> : <span className={cn("font-medium", m.quantity < 0 ? "text-[var(--danger)]" : "text-[var(--success)]")}>{formatSigned(m.quantity)}</span>),
    },
    { key: "from", header: "From", sortValue: (m) => m.from ?? "", cell: (m) => <span className="whitespace-nowrap">{m.from ? warehouseLabel(warehouses, m.from) : "—"}</span> },
    { key: "to", header: "To", sortValue: (m) => m.to ?? "", cell: (m) => <span className="whitespace-nowrap">{m.to ? warehouseLabel(warehouses, m.to) : "—"}</span> },
    { key: "user", header: "User", sortValue: (m) => m.user, cell: (m) => <span className="whitespace-nowrap">{m.user}</span> },
  ];

  const exportCsv = () => {
    if (!rows?.length) return;
    const sorted = sortRows(rows, columns, sort);
    const p = (m: StockMovement): ProductRow | undefined => byId.get(m.productId);
    downloadCsv(
      `evoq-inventory-stock-movements-${toIsoDate(new Date())}.csv`,
      ["Date", "Time", "Reference", "Product", "SKU", "Type", "Quantity", "From", "To", "User"],
      sorted.map((m) => [m.at.slice(0, 10), m.at.slice(11, 16), m.reference, p(m)?.name ?? "", p(m)?.sku ?? "", MOVEMENT_META[m.type].label, m.quantity, m.from ? warehouseLabel(warehouses, m.from) : "", m.to ? warehouseLabel(warehouses, m.to) : "", m.user]),
    );
    toast.success(`Exported ${pluralize(sorted.length, "movement")}`, { description: "CSV built from the demo ledger in your browser." });
  };

  return (
    <PageShell>
      <PageHeading
        crumbs={[{ label: "Insights" }, { label: "Stock Movement History" }]}
        title="Stock Movement History"
        description="Every receipt, issue, transfer and adjustment in the demo ledger — the same history shown on the Dashboard and item pages."
        actions={
          <OutlineButton icon={DownloadSimpleIcon} onClick={exportCsv} disabled={!rows?.length}>
            Export CSV
          </OutlineButton>
        }
      />
      <StatRow>
        <StatTile label="Movements" value={rows ? formatNumber(rows.length) : undefined} note={filtered ? "Matching filters" : "Last 120 days"} icon={ClockCounterClockwiseIcon} tone="brand" />
        <StatTile label="Units received" value={rows ? formatSigned(sumType("received") ?? 0) : undefined} icon={ArrowDownIcon} />
        <StatTile label="Units issued" value={rows ? formatSigned(sumType("issued") ?? 0) : undefined} icon={ArrowUpIcon} tone="coral" />
        <StatTile label="Units transferred" value={rows ? formatNumber(sumType("transfer") ?? 0) : undefined} note={rows ? `Adjustments net ${formatSigned(sumType("adjustment") ?? 0)}` : undefined} icon={ArrowsLeftRightIcon} />
      </StatRow>
      <Card className="mt-4" label="Movement ledger">
        <ListToolbar
          canClear={filtered}
          onClear={() => {
            setQ("");
            setType("");
            setWarehouse("");
            setDates({ from: "", to: "" });
          }}
        >
          <SearchInput value={q} onChange={setQ} placeholder="Search reference, product, SKU or user…" label="Search movements" className="w-full sm:w-[280px]" />
          <FilterSelect label="Transaction type" allLabel="All types" value={type} onChange={setType} options={Object.entries(MOVEMENT_META).map(([value, t]) => ({ value, label: t.label }))} className="w-full sm:w-[170px]" />
          <FilterSelect label="Warehouse" allLabel="All warehouses" value={warehouse} onChange={setWarehouse} options={(warehouses ?? []).map((w) => ({ value: w.id, label: w.name }))} className="w-full sm:w-[170px]" />
          <DateRange from={dates.from} to={dates.to} onChange={(f, t) => setDates({ from: f, to: t })} />
        </ListToolbar>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(m) => m.id}
          caption="Stock movements"
          noun="movements"
          minWidth={1080}
          sort={sort}
          onSortChange={setSort}
          pageSize={25}
          resetKey={`${q}|${type}|${warehouse}|${dates.from}|${dates.to}`}
          empty={<EmptyState icon={ClockCounterClockwiseIcon} title="No movements match" hint="Try a different search, type, warehouse or date range." />}
        />
      </Card>
      <PrototypeNote className="mt-4">This ledger is fixed demo history. Documents created in this session (receipts, transfers, adjustments, dispatches) are prototypes and don&apos;t add movements.</PrototypeNote>
    </PageShell>
  );
}
