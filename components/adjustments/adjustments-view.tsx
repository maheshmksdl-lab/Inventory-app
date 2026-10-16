"use client";

import { useMemo, useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, FileDashedIcon, PencilSimpleIcon, PlusIcon, SlidersHorizontalIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DataTable, DateRange, inRange, ListToolbar, matches, type Column } from "@/components/shared/data-table";
import { Detail, PrototypeNote, StatRow, StatTile, TextLink } from "@/components/shared/doc-ui";
import { ChoiceField, FormDialog, SESSION_NOTE, TextAreaField, TextField, useZodForm } from "@/components/shared/form-kit";
import { Card, ConfirmDialog, FilterSelect, OutlineButton, PageHeading, PageShell, PrimaryButton, SearchInput, ToneBadge } from "@/components/shared/inventory-ui";
import { ProductThumb } from "@/components/shared/product-thumb";
import { EmptyState } from "@/components/shared/state-panels";
import { useProducts, useRecords, useSaveRecord } from "@/hooks/use-operations";
import { warehouseLabel } from "@/lib/derive";
import { formatDateTime, formatNumber, formatSigned, nowIso } from "@/lib/format";
import { ADJUSTMENT_REASON, ADJUSTMENT_STATUS } from "@/lib/operations-meta";
import { itemHref } from "@/lib/routes";
import type { ProductRow } from "@/lib/types/inventory";
import type { AdjustmentReason, StockAdjustment } from "@/lib/types/operations";
import { cn } from "@/lib/utils";

const REASONS = Object.entries(ADJUSTMENT_REASON).map(([value, label]) => ({ value, label }));

const schema = z.object({
  productId: z.string().min(1, "Choose a product"),
  warehouseId: z.string().min(1, "Choose a warehouse"),
  direction: z.enum(["increase", "decrease"]),
  quantity: z
    .string()
    .trim()
    .regex(/^\d+$/, "Enter a whole number")
    .refine((v) => Number(v) > 0, "Quantity must be above 0"),
  reason: z.string().min(1, "Choose a reason"),
  notes: z.string().max(600),
});
type Values = z.input<typeof schema>;

function AdjustmentDialog({ initial, products, onClose }: { initial: StockAdjustment | null; products: ProductRow[]; onClose: () => void }) {
  const save = useSaveRecord("adjustments");
  const { data: warehouses } = useRecords("warehouses");
  const [pending, setPending] = useState<Values | null>(null);
  const onHandOf = (v: Values) => products.find((p) => p.id === v.productId)?.stock.find((b) => b.warehouseId === v.warehouseId)?.onHand ?? 0;
  const form = useZodForm<Values>(
    schema,
    {
      productId: initial?.productId ?? "",
      warehouseId: initial?.warehouseId ?? "wh-main",
      direction: initial && initial.quantity > 0 ? "increase" : "decrease",
      quantity: initial ? String(Math.abs(initial.quantity)) : "",
      reason: initial?.reason ?? "",
      notes: initial?.notes ?? "",
    },
    "adjustment",
    (v) => (v.direction === "decrease" && Number(v.quantity) > onHandOf(v) && v.productId ? { quantity: `Only ${onHandOf(v)} on hand at this warehouse` } : {}),
  );
  const v = form.values;
  const onHand = onHandOf(v);
  const qty = Number(v.quantity) || 0;
  const delta = v.direction === "increase" ? qty : -qty;

  const commit = async () => {
    if (!pending) return;
    const saved = await save.mutateAsync({
      id: initial?.id ?? "",
      number: initial?.number ?? "",
      productId: pending.productId,
      warehouseId: pending.warehouseId,
      quantity: pending.direction === "increase" ? Number(pending.quantity) : -Number(pending.quantity),
      reason: pending.reason as AdjustmentReason,
      notes: pending.notes.trim(),
      createdBy: initial?.createdBy ?? "Admin User",
      createdAt: initial?.createdAt ?? nowIso(),
      status: "draft",
    });
    toast.success("Draft adjustment saved", { description: `${saved.number} · ${SESSION_NOTE} Stock is unchanged.` });
    setPending(null);
    onClose();
  };

  return (
    <>
      <FormDialog
        open={!pending}
        wide
        onOpenChange={(o) => !o && onClose()}
        title={initial ? `Edit ${initial.number}` : "New stock adjustment"}
        description="Record a correction for damaged, missing, expired or found stock. Saved as a draft — stock balances don't change."
        submitLabel="Review & save draft"
        saving={form.saving}
        onSubmit={form.handleSubmit((vals) => setPending(vals))}
      >
        <ChoiceField form={form} name="productId" label="Product" required className="sm:col-span-2" options={products.filter((p) => p.lifecycle === "active").map((p) => ({ value: p.id, label: `${p.name} · ${p.sku}` }))} placeholder="Choose a product" />
        <ChoiceField form={form} name="warehouseId" label="Warehouse" required options={(warehouses ?? []).map((w) => ({ value: w.id, label: w.name }))} />
        <ChoiceField
          form={form}
          name="direction"
          label="Adjustment type"
          required
          options={[
            { value: "decrease", label: "Decrease (remove stock)" },
            { value: "increase", label: "Increase (add stock)" },
          ]}
        />
        <TextField form={form} name="quantity" label="Quantity" required inputMode="numeric" inputClassName="tabular-nums" hint={v.productId ? `${formatNumber(onHand)} on hand at this warehouse` : undefined} />
        <ChoiceField form={form} name="reason" label="Reason" required options={REASONS} placeholder="Choose a reason" />
        <TextAreaField form={form} name="notes" label="Notes" className="sm:col-span-2" rows={2} placeholder="What happened, batch numbers, who checked…" />
        {v.productId && qty > 0 && (
          <p className="rounded-lg bg-[#F9FAFB] px-3 py-2.5 text-[12.5px] leading-5 text-ink-body sm:col-span-2">
            If posted in a live system, on hand would go from <span className="font-semibold text-ink tabular-nums">{formatNumber(onHand)}</span> to{" "}
            <span className="font-semibold text-ink tabular-nums">{formatNumber(onHand + delta)}</span> ({formatSigned(delta)}). This prototype only saves the draft.
          </p>
        )}
      </FormDialog>
      <ConfirmDialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
        title="Save this draft adjustment?"
        destructive={false}
        pending={save.isPending}
        confirmLabel="Save draft"
        onConfirm={() => void commit()}
        description={
          pending && (
            <div className="space-y-2">
              <p>
                <span className="font-medium text-ink">{formatSigned(pending.direction === "increase" ? Number(pending.quantity) : -Number(pending.quantity))}</span> ×{" "}
                {products.find((p) => p.id === pending.productId)?.name} at {warehouseLabel(warehouses, pending.warehouseId)} — {ADJUSTMENT_REASON[pending.reason as AdjustmentReason]}.
              </p>
              <p>It will be saved as a draft in this browser tab. No inventory transaction is posted and stock balances stay the same.</p>
            </div>
          )
        }
      />
    </>
  );
}

function AdjustmentDetail({ a, product, warehouse, onClose, onEdit }: { a: StockAdjustment; product?: ProductRow; warehouse: string; onClose: () => void; onEdit: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogTitle className="flex items-center gap-3 pr-8 text-[17px] font-semibold text-ink">
          <span className="font-mono">{a.number}</span> <ToneBadge tone={ADJUSTMENT_STATUS[a.status]} />
        </DialogTitle>
        <DialogDescription className="text-[13px] text-ink-muted">{a.status === "posted" ? "Part of the seeded stock history (also in Stock Movement History)." : "Draft — not posted. Stock balances are unchanged."}</DialogDescription>
        <dl className="grid grid-cols-2 gap-4">
          <Detail label="Product" className="col-span-2">
            <TextLink href={itemHref(a.productId)}>{product?.name ?? a.productId}</TextLink> <span className="font-mono text-[12px] text-ink-muted">{product?.sku}</span>
          </Detail>
          <Detail label="Warehouse">{warehouse}</Detail>
          <Detail label="Quantity change">
            <span className={cn("font-semibold", a.quantity < 0 ? "text-[var(--danger)]" : "text-[var(--success)]")}>{formatSigned(a.quantity)}</span>
          </Detail>
          <Detail label="Type">{a.quantity < 0 ? "Decrease" : "Increase"}</Detail>
          <Detail label="Reason">{ADJUSTMENT_REASON[a.reason]}</Detail>
          <Detail label="Created by">{a.createdBy}</Detail>
          <Detail label="Date">{formatDateTime(a.createdAt)}</Detail>
          <Detail label="Notes" className="col-span-2">
            {a.notes || <span className="text-ink-muted">No notes</span>}
          </Detail>
        </dl>
        {a.status === "draft" && (
          <div className="flex justify-end">
            <OutlineButton icon={PencilSimpleIcon} onClick={onEdit}>
              Edit draft
            </OutlineButton>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function AdjustmentsView({ startNew = false }: { startNew?: boolean }) {
  const { data: adjustments } = useRecords("adjustments");
  const { data: warehouses } = useRecords("warehouses");
  const { data: products } = useProducts();
  const [q, setQ] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [reason, setReason] = useState("");
  const [direction, setDirection] = useState("");
  const [status, setStatus] = useState("");
  const [dates, setDates] = useState({ from: "", to: "" });
  const [editing, setEditing] = useState<StockAdjustment | "new" | null>(startNew ? "new" : null);
  const [viewing, setViewing] = useState<StockAdjustment | null>(null);
  const byId = useMemo(() => new Map((products ?? []).map((p) => [p.id, p])), [products]);

  const rows = useMemo(
    () =>
      adjustments?.filter((a) => {
        const p = byId.get(a.productId);
        return (
          (!warehouse || a.warehouseId === warehouse) &&
          (!reason || a.reason === reason) &&
          (!status || a.status === status) &&
          (!direction || (direction === "increase" ? a.quantity > 0 : a.quantity < 0)) &&
          inRange(a.createdAt, dates.from, dates.to) &&
          matches(q, a.number, p?.name, p?.sku, a.createdBy)
        );
      }),
    [adjustments, byId, warehouse, reason, status, direction, dates, q],
  );
  const filtered = !!(q || warehouse || reason || status || direction || dates.from || dates.to);
  const posted = adjustments?.filter((a) => a.status === "posted");

  const columns: Column<StockAdjustment>[] = [
    { key: "number", header: "Reference", sortValue: (a) => a.number, cell: (a) => <span className="font-mono text-[12.5px] font-semibold whitespace-nowrap text-ink">{a.number}</span> },
    {
      key: "product",
      header: "Product",
      sortValue: (a) => byId.get(a.productId)?.name ?? "",
      cell: (a) => {
        const p = byId.get(a.productId);
        return (
          <span className="flex min-w-[200px] items-center gap-3">
            {p && <ProductThumb icon={p.icon} src={p.image} size={30} />}
            <span className="min-w-0">
              <TextLink href={itemHref(a.productId)} className="block truncate">
                {p?.name ?? a.productId}
              </TextLink>
              <span className="block font-mono text-[12px] leading-4 text-ink-muted">{p?.sku}</span>
            </span>
          </span>
        );
      },
    },
    { key: "warehouse", header: "Warehouse", sortValue: (a) => warehouseLabel(warehouses, a.warehouseId), cell: (a) => <span className="whitespace-nowrap">{warehouseLabel(warehouses, a.warehouseId)}</span> },
    {
      key: "type",
      header: "Type",
      sortValue: (a) => Math.sign(a.quantity),
      cell: (a) => (
        <span className="inline-flex items-center gap-1 whitespace-nowrap">
          {a.quantity < 0 ? <ArrowDownIcon size={13} aria-hidden className="text-[var(--danger)]" /> : <ArrowUpIcon size={13} aria-hidden className="text-[var(--success)]" />}
          {a.quantity < 0 ? "Decrease" : "Increase"}
        </span>
      ),
    },
    { key: "qty", header: "Qty change", align: "right", sortValue: (a) => a.quantity, cell: (a) => <span className={cn("font-semibold", a.quantity < 0 ? "text-[var(--danger)]" : "text-[var(--success)]")}>{formatSigned(a.quantity)}</span> },
    { key: "reason", header: "Reason", sortValue: (a) => a.reason, cell: (a) => <span className="whitespace-nowrap">{ADJUSTMENT_REASON[a.reason]}</span> },
    { key: "by", header: "Created by", sortValue: (a) => a.createdBy, cell: (a) => <span className="whitespace-nowrap">{a.createdBy}</span> },
    { key: "date", header: "Date", sortValue: (a) => a.createdAt, cell: (a) => <span className="whitespace-nowrap">{formatDateTime(a.createdAt)}</span> },
    { key: "status", header: "Status", sortValue: (a) => a.status, cell: (a) => <ToneBadge tone={ADJUSTMENT_STATUS[a.status]} /> },
  ];

  return (
    <PageShell>
      <PageHeading
        crumbs={[{ label: "Inventory" }, { label: "Stock Adjustments" }]}
        title="Stock Adjustments"
        description="Corrections for damaged, missing, expired or found stock."
        actions={
          <PrimaryButton icon={PlusIcon} onClick={() => setEditing("new")} disabled={!products}>
            New Adjustment
          </PrimaryButton>
        }
      />
      <StatRow>
        <StatTile label="Draft adjustments" value={adjustments?.filter((a) => a.status === "draft").length} icon={FileDashedIcon} tone="coral" />
        <StatTile label="Posted (last 75 days)" value={posted?.length} icon={SlidersHorizontalIcon} />
        <StatTile label="Units removed (posted)" value={posted ? formatNumber(posted.reduce((s, a) => s + Math.max(0, -a.quantity), 0)) : undefined} icon={ArrowDownIcon} />
        <StatTile label="Units added (posted)" value={posted ? formatNumber(posted.reduce((s, a) => s + Math.max(0, a.quantity), 0)) : undefined} icon={ArrowUpIcon} tone="brand" />
      </StatRow>
      <Card className="mt-4" label="Adjustments">
        <ListToolbar
          canClear={filtered}
          onClear={() => {
            setQ("");
            setWarehouse("");
            setReason("");
            setDirection("");
            setStatus("");
            setDates({ from: "", to: "" });
          }}
        >
          <SearchInput value={q} onChange={setQ} placeholder="Search reference, product or user…" label="Search adjustments" className="w-full sm:w-[260px]" />
          <FilterSelect label="Warehouse" allLabel="All warehouses" value={warehouse} onChange={setWarehouse} options={(warehouses ?? []).map((w) => ({ value: w.id, label: w.name }))} className="w-full sm:w-[170px]" />
          <FilterSelect
            label="Type"
            allLabel="All types"
            value={direction}
            onChange={setDirection}
            options={[
              { value: "decrease", label: "Decrease" },
              { value: "increase", label: "Increase" },
            ]}
            className="w-full sm:w-[130px]"
          />
          <FilterSelect label="Reason" allLabel="All reasons" value={reason} onChange={setReason} options={REASONS} className="w-full sm:w-[160px]" />
          <FilterSelect
            label="Status"
            allLabel="All statuses"
            value={status}
            onChange={setStatus}
            options={[
              { value: "draft", label: "Draft" },
              { value: "posted", label: "Posted (history)" },
            ]}
            className="w-full sm:w-[150px]"
          />
          <DateRange from={dates.from} to={dates.to} onChange={(f, t) => setDates({ from: f, to: t })} />
        </ListToolbar>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(a) => a.id}
          onRowClick={setViewing}
          caption="Stock adjustments"
          noun="adjustments"
          minWidth={1040}
          defaultSort={{ key: "date", dir: "desc" }}
          resetKey={`${q}|${warehouse}|${reason}|${direction}|${status}|${dates.from}|${dates.to}`}
          empty={<EmptyState icon={SlidersHorizontalIcon} title={filtered ? "No adjustments match" : "No adjustments yet"} hint={filtered ? "Try different filters." : "Record your first correction."} />}
        />
      </Card>
      <PrototypeNote className="mt-4">New adjustments are saved as drafts in this browser tab and never post inventory transactions. Posted rows are the seeded history and match ADJ entries in Stock Movement History.</PrototypeNote>
      {editing && products && <AdjustmentDialog key={editing === "new" ? "new" : editing.id} initial={editing === "new" ? null : editing} products={products} onClose={() => setEditing(null)} />}
      {viewing && (
        <AdjustmentDetail
          a={viewing}
          product={byId.get(viewing.productId)}
          warehouse={warehouseLabel(warehouses, viewing.warehouseId)}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setEditing(viewing);
            setViewing(null);
          }}
        />
      )}
    </PageShell>
  );
}
