"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheckIcon, ClipboardTextIcon, MagnifyingGlassIcon, PlusIcon, WarningIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { z } from "zod";
import { DataTable, DateRange, inRange, ListToolbar, matches, type Column } from "@/components/shared/data-table";
import { PrototypeNote, StatRow, StatTile, TextLink } from "@/components/shared/doc-ui";
import { ChoiceField, FormDialog, SESSION_NOTE, TextAreaField, TextField, useZodForm } from "@/components/shared/form-kit";
import { Card, FilterSelect, PageHeading, PageShell, PrimaryButton, SearchInput, ToneBadge } from "@/components/shared/inventory-ui";
import { EmptyState } from "@/components/shared/state-panels";
import { useProducts, useRecords, useSaveRecord } from "@/hooks/use-operations";
import { warehouseLabel } from "@/lib/derive";
import { formatDate, formatNumber, toIsoDate } from "@/lib/format";
import { STOCKTAKE_STATUS } from "@/lib/operations-meta";
import { recordHref } from "@/lib/routes";
import type { Stocktake } from "@/lib/types/operations";

export const stocktakeProgress = (s: Stocktake) => {
  const counted = s.lines.filter((l) => l.counted !== null).length;
  const variances = s.lines.filter((l) => l.counted !== null && l.counted !== l.expected).length;
  return { counted, total: s.lines.length, variances, pct: s.lines.length ? Math.round((counted / s.lines.length) * 100) : 0 };
};

const schema = z.object({
  warehouseId: z.string().min(1, "Choose a warehouse"),
  countDate: z.string().min(1, "Choose a count date"),
  assignee: z.string().min(1, "Assign someone"),
  category: z.string(),
  notes: z.string().max(600),
});
type Values = z.input<typeof schema>;

function CreateStocktakeDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const save = useSaveRecord("stocktakes");
  const { data: warehouses } = useRecords("warehouses");
  const { data: users } = useRecords("users");
  const { data: categories } = useRecords("categories");
  const { data: products } = useProducts();
  const form = useZodForm<Values>(schema, { warehouseId: "wh-main", countDate: toIsoDate(new Date()), assignee: "", category: "__all", notes: "" }, "stocktake");
  const category = form.values.category === "__all" ? "" : form.values.category;
  const scope = (products ?? []).filter((p) => p.lifecycle === "active" && (!category || p.category === category));

  return (
    <FormDialog
      open
      wide
      onOpenChange={(o) => !o && onClose()}
      title="New stocktake"
      description="Snapshot expected quantities now and count them on the day. Variances are shown for review only."
      submitLabel="Create stocktake"
      saving={form.saving}
      note={`${scope.length} product(s) will be included.`}
      onSubmit={form.handleSubmit(async (v) => {
        const saved = await save.mutateAsync({
          id: "",
          number: "",
          warehouseId: v.warehouseId,
          countDate: v.countDate,
          assignee: v.assignee,
          category,
          status: "scheduled",
          lines: scope.map((p) => ({ productId: p.id, expected: p.stock.find((b) => b.warehouseId === v.warehouseId)?.onHand ?? 0, counted: null })),
          notes: v.notes.trim(),
        });
        toast.success("Stocktake scheduled", { description: `${saved.number} · ${SESSION_NOTE}` });
        router.push(recordHref("stocktakes", saved.id));
      })}
    >
      <ChoiceField form={form} name="warehouseId" label="Warehouse" required options={(warehouses ?? []).filter((w) => w.status === "active").map((w) => ({ value: w.id, label: w.name }))} />
      <TextField form={form} name="countDate" label="Count date" required type="date" />
      <ChoiceField form={form} name="assignee" label="Assigned to" required options={(users ?? []).filter((u) => u.status === "active").map((u) => ({ value: u.short, label: `${u.name} · ${u.team}` }))} placeholder="Choose a person" />
      <ChoiceField form={form} name="category" label="Scope" options={[{ value: "__all", label: "All active products" }, ...(categories ?? []).filter((c) => c.status === "active").map((c) => ({ value: c.name, label: `Category: ${c.name}` }))]} />
      <TextAreaField form={form} name="notes" label="Notes" className="sm:col-span-2" rows={2} placeholder="Instructions for the counting team…" />
    </FormDialog>
  );
}

export function StocktakesView() {
  const router = useRouter();
  const { data: stocktakes } = useRecords("stocktakes");
  const { data: warehouses } = useRecords("warehouses");
  const [q, setQ] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [status, setStatus] = useState("");
  const [dates, setDates] = useState({ from: "", to: "" });
  const [creating, setCreating] = useState(false);

  const rows = useMemo(
    () => stocktakes?.filter((s) => (!warehouse || s.warehouseId === warehouse) && (!status || s.status === status) && inRange(s.countDate, dates.from, dates.to) && matches(q, s.number, s.assignee, s.category)),
    [stocktakes, warehouse, status, dates, q],
  );
  const filtered = !!(q || warehouse || status || dates.from || dates.to);
  const open = stocktakes?.filter((s) => s.status === "in-progress" || s.status === "in-review");

  const columns: Column<Stocktake>[] = [
    {
      key: "number",
      header: "Reference",
      sortValue: (s) => s.number,
      cell: (s) => (
        <TextLink href={recordHref("stocktakes", s.id)} className="font-mono text-[12.5px] font-semibold">
          {s.number}
        </TextLink>
      ),
    },
    { key: "warehouse", header: "Warehouse", sortValue: (s) => warehouseLabel(warehouses, s.warehouseId), cell: (s) => <span className="whitespace-nowrap">{warehouseLabel(warehouses, s.warehouseId)}</span> },
    { key: "scope", header: "Scope", sortValue: (s) => s.category, cell: (s) => s.category || "All products" },
    { key: "date", header: "Count date", sortValue: (s) => s.countDate, cell: (s) => <span className="whitespace-nowrap">{formatDate(s.countDate)}</span> },
    { key: "assignee", header: "Assigned to", sortValue: (s) => s.assignee, cell: (s) => <span className="whitespace-nowrap">{s.assignee}</span> },
    { key: "products", header: "Products", align: "right", sortValue: (s) => s.lines.length, cell: (s) => formatNumber(s.lines.length) },
    {
      key: "progress",
      header: "Count progress",
      sortValue: (s) => stocktakeProgress(s).pct,
      cell: (s) => {
        const p = stocktakeProgress(s);
        return (
          <span className="flex min-w-[140px] items-center gap-2">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#F2F4F7]" role="meter" aria-valuenow={p.pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${s.number} counted`}>
              <span className="block h-full rounded-full bg-inventory-hover" style={{ width: `${p.pct}%` }} />
            </span>
            <span className="w-16 text-right text-[12px] text-ink-muted tabular-nums">
              {p.counted}/{p.total}
            </span>
          </span>
        );
      },
    },
    { key: "variances", header: "Variances", align: "right", sortValue: (s) => stocktakeProgress(s).variances, cell: (s) => formatNumber(stocktakeProgress(s).variances) },
    { key: "status", header: "Status", sortValue: (s) => s.status, cell: (s) => <ToneBadge tone={STOCKTAKE_STATUS[s.status]} /> },
  ];

  return (
    <PageShell>
      <PageHeading
        crumbs={[{ label: "Inventory" }, { label: "Stocktakes / Physical Counts" }]}
        title="Stocktakes / Physical Counts"
        description="Plan counts, record what's on the shelf and review the differences."
        actions={
          <PrimaryButton icon={PlusIcon} onClick={() => setCreating(true)}>
            New Stocktake
          </PrimaryButton>
        }
      />
      <StatRow>
        <StatTile label="Scheduled" value={stocktakes?.filter((s) => s.status === "scheduled").length} icon={CalendarCheckIcon} />
        <StatTile label="In progress / review" value={open?.length} icon={ClipboardTextIcon} tone="brand" />
        <StatTile label="Completed" value={stocktakes?.filter((s) => s.status === "completed").length} icon={MagnifyingGlassIcon} />
        <StatTile label="Lines with variance (open counts)" value={open?.reduce((n, s) => n + stocktakeProgress(s).variances, 0)} icon={WarningIcon} tone="coral" />
      </StatRow>
      <Card className="mt-4" label="Stocktakes">
        <ListToolbar
          canClear={filtered}
          onClear={() => {
            setQ("");
            setWarehouse("");
            setStatus("");
            setDates({ from: "", to: "" });
          }}
        >
          <SearchInput value={q} onChange={setQ} placeholder="Search reference, person or category…" label="Search stocktakes" className="w-full sm:w-[280px]" />
          <FilterSelect label="Warehouse" allLabel="All warehouses" value={warehouse} onChange={setWarehouse} options={(warehouses ?? []).map((w) => ({ value: w.id, label: w.name }))} className="w-full sm:w-[170px]" />
          <FilterSelect label="Status" allLabel="All statuses" value={status} onChange={setStatus} options={Object.entries(STOCKTAKE_STATUS).map(([value, t]) => ({ value, label: t.label }))} className="w-full sm:w-[160px]" />
          <DateRange from={dates.from} to={dates.to} onChange={(f, t) => setDates({ from: f, to: t })} label="Count date" />
        </ListToolbar>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(s) => s.id}
          onRowClick={(s) => router.push(recordHref("stocktakes", s.id))}
          caption="Stocktakes"
          noun="stocktakes"
          defaultSort={{ key: "date", dir: "desc" }}
          resetKey={`${q}|${warehouse}|${status}|${dates.from}|${dates.to}`}
          empty={<EmptyState icon={ClipboardTextIcon} title={filtered ? "No stocktakes match" : "No stocktakes yet"} hint={filtered ? "Try different filters." : "Schedule a count to check stock on the shelf."} />}
        />
      </Card>
      <PrototypeNote className="mt-4">Variances are calculated in the browser for review. Completing a stocktake does not post adjustments or change stock balances.</PrototypeNote>
      {creating && <CreateStocktakeDialog onClose={() => setCreating(false)} />}
    </PageShell>
  );
}
