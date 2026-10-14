"use client";

import { useMemo, useState } from "react";
import { DownloadSimpleIcon, FileXIcon, PrinterIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { DataTable, DateRange, ListToolbar, sortRows, type Column, type SortState } from "@/components/shared/data-table";
import { MissingRecord, PrototypeNote, StatRow, StatTile } from "@/components/shared/doc-ui";
import { Card, FilterSelect, OutlineButton, PageHeading, PageShell, PrimaryButton, SearchInput, td } from "@/components/shared/inventory-ui";
import { EmptyState } from "@/components/shared/state-panels";
import { useLedger, useProducts, useRecords, useSettings } from "@/hooks/use-operations";
import { downloadCsv } from "@/lib/csv";
import { addDays, formatCurrency, formatDate, formatNumber, formatRange, formatSigned, pluralize, toIsoDate } from "@/lib/format";
import { DEMO_TODAY } from "@/lib/mock-data/movements";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { reportById, type CellFormat, type ReportColumn, type ReportRow } from "./report-defs";

const fmt = (v: string | number | undefined, f: CellFormat = "text") => {
  if (v === undefined || v === "") return "—";
  switch (f) {
    case "number":
      return formatNumber(Number(v));
    case "signed":
      return formatSigned(Number(v));
    case "currency":
      return formatCurrency(Number(v));
    case "date":
      return formatDate(String(v));
    case "percent":
      return `${v}%`;
    default:
      return String(v);
  }
};
const numeric = (c: ReportColumn) => ["number", "signed", "currency", "percent"].includes(c.format ?? "text");

export function ReportView({ id }: { id: string }) {
  const def = reportById(id);
  const { data: products } = useProducts();
  const { data: movements } = useLedger();
  const { data: purchaseOrders } = useRecords("purchaseOrders");
  const { data: salesOrders } = useRecords("salesOrders");
  const { data: adjustments } = useRecords("adjustments");
  const { data: vendors } = useRecords("vendors");
  const { data: customers } = useRecords("customers");
  const { data: warehouses } = useRecords("warehouses");
  const { data: settings } = useSettings();
  // Dated reports open on the last 30 days of the demo ledger.
  const [dates, setDates] = useState({ from: addDays(DEMO_TODAY, -29), to: DEMO_TODAY });
  const [warehouse, setWarehouse] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortState | null>(def ? def.defaultSort : null);

  const ready = products && movements && purchaseOrders && salesOrders && adjustments && vendors && customers && warehouses && settings;
  const all = useMemo(() => {
    if (!def || !ready) return undefined;
    return def.build({ products, movements, purchaseOrders, salesOrders, adjustments, vendors, customers, warehouses, settings }, { from: def.dated ? dates.from : "", to: def.dated ? dates.to : "", warehouse });
  }, [def, ready, products, movements, purchaseOrders, salesOrders, adjustments, vendors, customers, warehouses, settings, dates, warehouse]);
  const rows = useMemo(() => all?.filter((r) => !q.trim() || r._search.toLowerCase().includes(q.trim().toLowerCase())), [all, q]);

  if (!def) return <MissingRecord crumbs={[{ label: "Insights" }, { label: "Reports & Analytics", href: ROUTES.reports }, { label: "Report" }]} noun="report" backHref={ROUTES.reports} backLabel="Back to Reports" />;

  const columns: Column<ReportRow>[] = def.columns.map((c) => ({
    key: c.key,
    header: c.label,
    align: numeric(c) ? "right" : undefined,
    sortValue: (r) => r[c.key] ?? "",
    cell: (r) => <span className={cn("whitespace-nowrap", c.format === "mono" && "font-mono text-[12.5px]", c.key === "name" && "font-medium text-ink")}>{fmt(r[c.key], c.format)}</span>,
  }));
  const totals = Object.fromEntries(def.columns.filter((c) => c.total).map((c) => [c.key, (rows ?? []).reduce((s, r) => s + Number(r[c.key] ?? 0), 0)]));
  const firstTotal = def.columns.findIndex((c) => c.total);
  const scopeLabel = `${warehouse ? (warehouses?.find((w) => w.id === warehouse)?.name ?? "") : "All warehouses"}${def.dated ? ` · ${dates.from && dates.to ? formatRange(dates.from, dates.to) : "All dates"}` : " · as of today"}`;

  const exportCsv = () => {
    if (!rows?.length) return;
    const sorted = sortRows(rows, columns, sort);
    downloadCsv(
      `evoq-inventory-${def.id}-${toIsoDate(new Date())}.csv`,
      def.columns.map((c) => c.label),
      sorted.map((r) => def.columns.map((c) => r[c.key] ?? "")),
    );
    toast.success(`Exported ${pluralize(sorted.length, "row")}`, { description: `${def.title} · ${scopeLabel}` });
  };

  return (
    <PageShell>
      <PageHeading
        crumbs={[{ label: "Insights" }, { label: "Reports & Analytics", href: ROUTES.reports }, { label: def.title }]}
        title={def.title}
        description={def.description}
        actions={
          <>
            <OutlineButton icon={PrinterIcon} onClick={() => window.print()} disabled={!rows?.length}>
              Print
            </OutlineButton>
            <PrimaryButton icon={DownloadSimpleIcon} onClick={exportCsv} disabled={!rows?.length}>
              Export CSV
            </PrimaryButton>
          </>
        }
      />

      <div className="print-area">
        <div className="hidden print:block">
          <p className="text-[11px] text-ink-muted">EVOQ Inventory · demo data</p>
          <h1 className="text-[18px] font-semibold text-ink">{def.title}</h1>
          <p className="mb-3 text-[12px] text-ink-muted">{scopeLabel}</p>
        </div>
        <StatRow className="print:mt-0 print:mb-3">
          <StatTile label="Rows" value={rows ? formatNumber(rows.length) : undefined} note={scopeLabel} />
          {def.columns
            .filter((c) => c.total)
            .slice(0, 3)
            .map((c) => (
              <StatTile key={c.key} label={`Total ${c.label.toLowerCase()}`} value={rows ? fmt(totals[c.key], c.format) : undefined} />
            ))}
        </StatRow>

        <Card className="mt-4" label={def.title}>
          <ListToolbar
            canClear={!!(q || warehouse || (def.dated && (dates.from !== addDays(DEMO_TODAY, -29) || dates.to !== DEMO_TODAY)))}
            onClear={() => {
              setQ("");
              setWarehouse("");
              setDates({ from: addDays(DEMO_TODAY, -29), to: DEMO_TODAY });
            }}
          >
            <SearchInput value={q} onChange={setQ} placeholder="Search this report…" label={`Search ${def.title}`} className="w-full sm:w-[240px]" />
            <FilterSelect label="Warehouse" allLabel="All warehouses" value={warehouse} onChange={setWarehouse} options={(warehouses ?? []).map((w) => ({ value: w.id, label: w.name }))} className="w-full sm:w-[170px]" />
            {def.dated ? <DateRange from={dates.from} to={dates.to} onChange={(f, t) => setDates({ from: f, to: t })} /> : <span className="text-[12.5px] text-ink-muted">Snapshot of current stock — no date range</span>}
          </ListToolbar>
          <DataTable
            rows={rows}
            columns={columns}
            rowKey={(r) => r._id}
            caption={def.title}
            noun="rows"
            minWidth={Math.max(720, def.columns.length * 120)}
            sort={sort}
            onSortChange={setSort}
            pageSize={25}
            resetKey={`${q}|${warehouse}|${dates.from}|${dates.to}`}
            empty={<EmptyState icon={FileXIcon} title="No rows for these filters" hint="Widen the date range, choose another warehouse or clear the search." />}
            footer={
              rows && rows.length > 0 && firstTotal >= 0 ? (
                <tr className="border-t border-line bg-[#FAFAFB]">
                  {def.columns.map((c, i) =>
                    i < firstTotal ? (
                      i === 0 ? (
                        <th key={c.key} scope="row" colSpan={firstTotal} className={cn(td, "text-left font-semibold text-ink")}>
                          Total
                        </th>
                      ) : null
                    ) : (
                      <td key={c.key} className={cn(td, "font-semibold text-ink tabular-nums", numeric(c) && "text-right")}>
                        {c.total ? fmt(totals[c.key], c.format) : ""}
                      </td>
                    ),
                  )}
                </tr>
              ) : undefined
            }
          />
        </Card>
        <PrototypeNote className="mt-4" label="Method">
          {def.method}
        </PrototypeNote>
      </div>
    </PageShell>
  );
}
