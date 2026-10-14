"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClockIcon, LinkBreakIcon, PlusIcon, ReceiptIcon, WarningIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { z } from "zod";
import { DataTable, DateRange, inRange, ListToolbar, matches, type Column } from "@/components/shared/data-table";
import { StatRow, StatTile, TextLink } from "@/components/shared/doc-ui";
import { ChoiceField, FormDialog, SESSION_NOTE, TextAreaField, TextField, useZodForm } from "@/components/shared/form-kit";
import { Card, FilterSelect, PageHeading, PageShell, PrimaryButton, SearchInput, ToneBadge } from "@/components/shared/inventory-ui";
import { EmptyState } from "@/components/shared/state-panels";
import { useRecords, useSaveRecord } from "@/hooks/use-operations";
import { docTotals } from "@/lib/doc-math";
import { addDays, formatCurrency, formatDate, toIsoDate } from "@/lib/format";
import { BILL_STATUS } from "@/lib/operations-meta";
import { recordHref } from "@/lib/routes";
import type { SupplierBill } from "@/lib/types/operations";
import { vendorLabel } from "./po-columns";

/** Shown wherever bills appear: there is no accounting or payment connection. */
export function PaymentsNotice({ className }: { className?: string }) {
  return (
    <div role="note" className={`flex items-start gap-2.5 rounded-xl border border-[#FEDF89] bg-[var(--warning-bg)] px-4 py-3 text-[13px] leading-5 text-ink-body ${className ?? ""}`}>
      <LinkBreakIcon size={18} aria-hidden className="mt-px shrink-0 text-[var(--warning)]" />
      <p>
        <span className="font-semibold text-ink">Payments and accounting are not connected.</span> Bills here are demo records for review. No payment is made, scheduled or posted to a ledger, and statuses like Paid are sample data.
      </p>
    </div>
  );
}

const termsDays = (terms: string | undefined) => Number(/\d+/.exec(terms ?? "")?.[0] ?? 0);

const schema = z
  .object({
    vendorId: z.string().min(1, "Choose a vendor"),
    poId: z.string().min(1, "Choose the related purchase order"),
    vendorBillNo: z.string().trim().min(2, "Enter the vendor's bill number").max(40),
    billDate: z.string().min(1, "Choose the bill date"),
    dueDate: z.string().min(1, "Choose the due date"),
    amount: z
      .string()
      .trim()
      .regex(/^\d+(\.\d{1,2})?$/, "Enter an amount with up to 2 decimals")
      .refine((v) => Number(v) > 0, "Amount must be above 0"),
    notes: z.string().max(600),
  })
  .refine((v) => !v.billDate || !v.dueDate || v.dueDate >= v.billDate, { path: ["dueDate"], message: "Due date can't be before the bill date" });
type Values = z.input<typeof schema>;

function BillDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const save = useSaveRecord("supplierBills");
  const { data: vendors } = useRecords("vendors");
  const { data: pos } = useRecords("purchaseOrders");
  const today = toIsoDate(new Date());
  const form = useZodForm<Values>(schema, { vendorId: "", poId: "", vendorBillNo: "", billDate: today, dueDate: addDays(today, 30), amount: "", notes: "" }, "bill");
  const v = form.values;
  const vendorPos = (pos ?? []).filter((p) => p.vendorId === v.vendorId && ["confirmed", "partially-received", "completed"].includes(p.status));
  const po = vendorPos.find((p) => p.id === v.poId);
  const receivedValue = po ? docTotals(po.lines.map((l) => ({ ...l, quantity: l.received }))).total : 0;

  return (
    <FormDialog
      open
      wide
      onOpenChange={(o) => !o && onClose()}
      title="New supplier bill"
      description="Record a vendor's bill against a purchase order. Saved as a draft — no payment or accounting entry is created."
      submitLabel="Save draft bill"
      saving={form.saving}
      onSubmit={form.handleSubmit(async (vals) => {
        const saved = await save.mutateAsync({ id: "", number: "", vendorBillNo: vals.vendorBillNo.trim(), vendorId: vals.vendorId, poId: vals.poId, billDate: vals.billDate, dueDate: vals.dueDate, amount: Number(vals.amount), status: "draft", notes: vals.notes.trim() } satisfies SupplierBill);
        toast.success("Draft bill saved", { description: `${saved.number} · ${SESSION_NOTE}` });
        router.push(recordHref("supplierBills", saved.id));
      })}
    >
      <ChoiceField
        form={form}
        name="vendorId"
        label="Vendor"
        required
        options={(vendors ?? []).filter((x) => x.status === "active").map((x) => ({ value: x.id, label: x.name }))}
        placeholder="Choose a vendor"
      />
      <ChoiceField
        form={form}
        name="poId"
        label="Related purchase order"
        required
        options={vendorPos.map((p) => ({ value: p.id, label: `${p.number} · ${formatCurrency(docTotals(p.lines).total)}` }))}
        placeholder={v.vendorId ? (vendorPos.length ? "Choose a PO" : "No billable POs") : "Choose a vendor first"}
        hint={po ? `Received so far: ${formatCurrency(receivedValue, { decimals: true })} incl. tax` : undefined}
      />
      <TextField form={form} name="vendorBillNo" label="Vendor bill number" required placeholder="e.g. MER/INV/4821" />
      <TextField form={form} name="amount" label="Bill amount (₹, incl. tax)" required inputMode="decimal" inputClassName="tabular-nums" />
      <TextField form={form} name="billDate" label="Bill date" required type="date" />
      <TextField
        form={form}
        name="dueDate"
        label="Due date"
        required
        type="date"
        hint={
          v.vendorId && v.billDate ? (
            <button type="button" className="rounded font-medium text-brand hover:text-brand-press focus-visible:outline-2 focus-visible:outline-brand-action" onClick={() => form.set("dueDate", addDays(v.billDate, termsDays(vendors?.find((x) => x.id === v.vendorId)?.paymentTerms)))}>
              Use vendor terms ({vendors?.find((x) => x.id === v.vendorId)?.paymentTerms})
            </button>
          ) : undefined
        }
      />
      <TextAreaField form={form} name="notes" label="Notes" className="sm:col-span-2" rows={2} />
      {po && v.amount && Number(v.amount) > 0 && Math.abs(Number(v.amount) - receivedValue) > 1 && (
        <p className="rounded-lg bg-[var(--warning-bg)] px-3 py-2 text-[12.5px] text-[var(--warning)] sm:col-span-2">
          Bill amount differs from the received value by {formatCurrency(Math.abs(Number(v.amount) - receivedValue), { decimals: true })}. You can still save it for review.
        </p>
      )}
    </FormDialog>
  );
}

export function SupplierBillsView() {
  const router = useRouter();
  const { data: bills } = useRecords("supplierBills");
  const { data: vendors } = useRecords("vendors");
  const { data: pos } = useRecords("purchaseOrders");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [vendor, setVendor] = useState("");
  const [dates, setDates] = useState({ from: "", to: "" });
  const [creating, setCreating] = useState(false);
  const poNumber = useMemo(() => new Map((pos ?? []).map((p) => [p.id, p.number])), [pos]);

  const rows = useMemo(
    () => bills?.filter((b) => (!status || b.status === status) && (!vendor || b.vendorId === vendor) && inRange(b.billDate, dates.from, dates.to) && matches(q, b.number, b.vendorBillNo, vendorLabel(vendors, b.vendorId), poNumber.get(b.poId))),
    [bills, status, vendor, dates, q, vendors, poNumber],
  );
  const filtered = !!(q || status || vendor || dates.from || dates.to);
  const sumOf = (s: SupplierBill["status"]) => bills?.filter((b) => b.status === s).reduce((n, b) => n + b.amount, 0);
  const countOf = (s: SupplierBill["status"]) => bills?.filter((b) => b.status === s).length;

  const columns: Column<SupplierBill>[] = [
    {
      key: "number",
      header: "Bill",
      sortValue: (b) => b.number,
      cell: (b) => (
        <span className="block whitespace-nowrap">
          <TextLink href={recordHref("supplierBills", b.id)} className="font-mono text-[12.5px] font-semibold">
            {b.number}
          </TextLink>
          <span className="block font-mono text-[12px] leading-4 text-ink-muted">{b.vendorBillNo}</span>
        </span>
      ),
    },
    { key: "vendor", header: "Vendor", sortValue: (b) => vendorLabel(vendors, b.vendorId), cell: (b) => <span className="whitespace-nowrap">{vendorLabel(vendors, b.vendorId)}</span> },
    {
      key: "po",
      header: "Purchase order",
      sortValue: (b) => poNumber.get(b.poId) ?? "",
      cell: (b) => (
        <TextLink href={recordHref("purchaseOrders", b.poId)} className="font-mono text-[12.5px] font-normal">
          {poNumber.get(b.poId) ?? "—"}
        </TextLink>
      ),
    },
    { key: "billDate", header: "Bill date", sortValue: (b) => b.billDate, cell: (b) => <span className="whitespace-nowrap">{formatDate(b.billDate)}</span> },
    { key: "dueDate", header: "Due date", sortValue: (b) => b.dueDate, cell: (b) => <span className="whitespace-nowrap">{formatDate(b.dueDate)}</span> },
    { key: "amount", header: "Amount", align: "right", sortValue: (b) => b.amount, cell: (b) => <span className="font-semibold whitespace-nowrap text-ink">{formatCurrency(b.amount, { decimals: true })}</span> },
    { key: "status", header: "Status", sortValue: (b) => b.status, cell: (b) => <ToneBadge tone={BILL_STATUS[b.status]} /> },
  ];

  return (
    <PageShell>
      <PageHeading
        crumbs={[{ label: "Purchasing" }, { label: "Supplier Bills" }]}
        title="Supplier Bills"
        description="Vendor bills matched to purchase orders, for review."
        actions={
          <PrimaryButton icon={PlusIcon} onClick={() => setCreating(true)}>
            New Bill
          </PrimaryButton>
        }
      />
      <PaymentsNotice className="mt-5" />
      <StatRow className="mt-4">
        <StatTile label="Awaiting review" value={countOf("awaiting-review")} note={sumOf("awaiting-review") !== undefined ? formatCurrency(sumOf("awaiting-review")!) : undefined} icon={ClockIcon} />
        <StatTile label="Due" value={countOf("due")} note={sumOf("due") !== undefined ? formatCurrency(sumOf("due")!) : undefined} icon={ReceiptIcon} tone="brand" />
        <StatTile label="Overdue" value={countOf("overdue")} note={sumOf("overdue") !== undefined ? formatCurrency(sumOf("overdue")!) : undefined} icon={WarningIcon} tone="coral" />
        <StatTile label="Marked paid (sample)" value={countOf("paid")} note={sumOf("paid") !== undefined ? formatCurrency(sumOf("paid")!) : undefined} />
      </StatRow>
      <Card className="mt-4" label="Supplier bills">
        <ListToolbar
          canClear={filtered}
          onClear={() => {
            setQ("");
            setStatus("");
            setVendor("");
            setDates({ from: "", to: "" });
          }}
        >
          <SearchInput value={q} onChange={setQ} placeholder="Search bill, vendor bill no., vendor or PO…" label="Search supplier bills" className="w-full sm:w-[300px]" />
          <FilterSelect label="Status" allLabel="All statuses" value={status} onChange={setStatus} options={Object.entries(BILL_STATUS).map(([value, t]) => ({ value, label: t.label }))} className="w-full sm:w-[170px]" />
          <FilterSelect label="Vendor" allLabel="All vendors" value={vendor} onChange={setVendor} options={(vendors ?? []).map((v) => ({ value: v.id, label: v.name }))} className="w-full sm:w-[190px]" />
          <DateRange from={dates.from} to={dates.to} onChange={(f, t) => setDates({ from: f, to: t })} label="Bill date" />
        </ListToolbar>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(b) => b.id}
          onRowClick={(b) => router.push(recordHref("supplierBills", b.id))}
          caption="Supplier bills"
          noun="bills"
          defaultSort={{ key: "billDate", dir: "desc" }}
          resetKey={`${q}|${status}|${vendor}|${dates.from}|${dates.to}`}
          empty={<EmptyState icon={ReceiptIcon} title={filtered ? "No bills match" : "No bills yet"} hint={filtered ? "Try different filters." : "Record a vendor's bill against a purchase order."} />}
        />
      </Card>
      {creating && <BillDialog onClose={() => setCreating(false)} />}
    </PageShell>
  );
}
