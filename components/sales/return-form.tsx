"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { DetailSkeleton, PrototypeNote, TextLink } from "@/components/shared/doc-ui";
import { FormSection, SESSION_NOTE, StickyActions } from "@/components/shared/form-kit";
import { fieldClass, FormField, OutlineButton, PageHeading, PageShell, PrimaryButton, SelectField, td, th } from "@/components/shared/inventory-ui";
import { ProductThumb } from "@/components/shared/product-thumb";
import { useNextNumber, useProducts, useRecords, useSaveRecord } from "@/hooks/use-operations";
import { warehouseLabel } from "@/lib/derive";
import { formatDate, formatNumber, toIsoDate } from "@/lib/format";
import { RETURN_REASONS } from "@/lib/operations-meta";
import { itemHref, recordHref, ROUTES } from "@/lib/routes";
import type { SalesOrder, SalesReturn } from "@/lib/types/operations";
import { cn } from "@/lib/utils";
import { customerLabel } from "./so-columns";

type Row = { productId: string; shipped: number; include: boolean; qty: string; reason: string };
const rowsFor = (so: SalesOrder): Row[] => so.lines.filter((l) => l.fulfilled > 0).map((l) => ({ productId: l.productId, shipped: l.fulfilled, include: so.lines.length === 1, qty: "1", reason: "" }));

export function ReturnFormView({ soId: initialSo }: { soId?: string }) {
  const router = useRouter();
  const { data: sos } = useRecords("salesOrders");
  const { data: customers } = useRecords("customers");
  const { data: warehouses } = useRecords("warehouses");
  const { data: products } = useProducts();
  const { data: number } = useNextNumber("salesReturns");
  const save = useSaveRecord("salesReturns");
  const [soId, setSoId] = useState(initialSo ?? "");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [date, setDate] = useState(toIsoDate(new Date()));
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const crumbs = [{ label: "Sales & Fulfilment" }, { label: "Sales Returns", href: ROUTES.salesReturns }, { label: "New return" }];

  if (!sos || !products) return <DetailSkeleton crumbs={crumbs} />;
  const eligible = sos.filter((s) => s.status === "fulfilled" || s.status === "partially-fulfilled");
  const so = eligible.find((s) => s.id === soId);
  const lines = rows ?? (so ? rowsFor(so) : []);
  const byId = new Map(products.map((p) => [p.id, p]));
  const patch = (productId: string, p: Partial<Row>) => setRows(lines.map((r) => (r.productId === productId ? { ...r, ...p } : r)));

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!so) e.so = "Choose the original sales order";
    const chosen = lines.filter((r) => r.include);
    if (so && !chosen.length) e.lines = "Select at least one item to return";
    for (const r of chosen) {
      if (!/^\d+$/.test(r.qty) || Number(r.qty) < 1) e[`${r.productId}.qty`] = "At least 1";
      else if (Number(r.qty) > r.shipped) e[`${r.productId}.qty`] = `Max ${r.shipped}`;
      if (!r.reason) e[`${r.productId}.reason`] = "Choose a reason";
    }
    setErrors(e);
    if (Object.keys(e).length || !so) {
      toast.error("Check the return", { description: `${Object.keys(e).length} field(s) need attention.` });
      return;
    }
    const record: SalesReturn = {
      id: "",
      number: "",
      soId: so.id,
      customerId: so.customerId,
      warehouseId: so.warehouseId,
      requestedDate: date,
      status: "requested",
      lines: chosen.map((r) => ({ productId: r.productId, quantity: Number(r.qty), reason: r.reason, outcome: "" })),
      notes: notes.trim(),
      createdBy: "Admin User",
    };
    try {
      const saved = await save.mutateAsync(record);
      toast.success("Return created", { description: `${saved.number} · ${SESSION_NOTE}` });
      router.push(recordHref("salesReturns", saved.id));
    } catch (err) {
      toast.error("Couldn't save", { description: err instanceof Error ? err.message : undefined });
    }
  };

  return (
    <PageShell>
      <PageHeading crumbs={crumbs} title="New sales return" description={number ? `Will be saved as ${number}.` : "Record goods a customer is sending back."} />
      <div className="mt-5 space-y-4 pb-24">
        <PrototypeNote>The return is saved as a demo record. No credit note is issued, the customer isn&apos;t notified, and inventory isn&apos;t updated when goods are inspected.</PrototypeNote>
        <FormSection title="Original order">
          <FormField label="Sales order" htmlFor="rma-so" required error={errors.so} hint="Fulfilled or partially fulfilled orders">
            <SelectField
              id="rma-so"
              value={soId}
              onChange={(v) => {
                setSoId(v);
                const s = eligible.find((x) => x.id === v);
                setRows(s ? rowsFor(s) : []);
                setErrors({});
              }}
              options={eligible.map((s) => ({ value: s.id, label: `${s.number} · ${customerLabel(customers, s.customerId)} · ${formatDate(s.orderDate)}` }))}
              placeholder="Choose a sales order"
              invalid={!!errors.so}
            />
          </FormField>
          <FormField label="Requested date" htmlFor="rma-date" required>
            <input id="rma-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldClass} />
          </FormField>
          {so && (
            <dl className="grid grid-cols-2 gap-3 rounded-lg bg-[#F9FAFB] px-3 py-2.5 text-[12.5px]">
              <div>
                <dt className="text-ink-muted">Customer</dt>
                <dd className="font-medium text-ink">{customerLabel(customers, so.customerId)}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Return to</dt>
                <dd className="font-medium text-ink">{warehouseLabel(warehouses, so.warehouseId)}</dd>
              </div>
            </dl>
          )}
        </FormSection>
        <FormSection title="Items being returned" description="Tick each item coming back. Quantity can't exceed what was shipped." flush>
          {!so ? (
            <p className="px-5 pb-5 text-[13px] text-ink-muted">Choose a sales order to list what was shipped.</p>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[720px] border-collapse">
                <caption className="sr-only">Items to return</caption>
                <thead>
                  <tr className="border-y border-line-soft bg-[#FAFAFB]">
                    <th scope="col" className={cn(th, "w-10")}>
                      <span className="sr-only">Include</span>
                    </th>
                    <th scope="col" className={th}>
                      Product
                    </th>
                    <th scope="col" className={cn(th, "text-right")}>
                      Shipped
                    </th>
                    <th scope="col" className={cn(th, "w-28 text-right")}>
                      Return qty
                    </th>
                    <th scope="col" className={cn(th, "w-60")}>
                      Reason
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((r) => {
                    const p = byId.get(r.productId);
                    return (
                      <tr key={r.productId} className={cn("border-b border-line-soft align-top", r.include && "bg-brand-surface")}>
                        <td className={cn(td, "pt-4")}>
                          <Checkbox checked={r.include} onCheckedChange={(v) => patch(r.productId, { include: v === true })} aria-label={`Return ${p?.name}`} />
                        </td>
                        <td className={td}>
                          <span className="flex items-center gap-3">
                            {p && <ProductThumb icon={p.icon} src={p.image} size={30} />}
                            <TextLink href={itemHref(r.productId)}>{p?.name}</TextLink>
                          </span>
                        </td>
                        <td className={cn(td, "pt-4 text-right tabular-nums")}>{formatNumber(r.shipped)}</td>
                        <td className={td}>
                          <input value={r.qty} disabled={!r.include} onChange={(e) => patch(r.productId, { qty: e.target.value })} inputMode="numeric" aria-label={`Return quantity for ${p?.name}`} aria-invalid={errors[`${r.productId}.qty`] ? true : undefined} className={cn(fieldClass, "text-right tabular-nums")} />
                          {errors[`${r.productId}.qty`] && <p className="mt-1 text-right text-[11.5px] font-medium text-[#DC2626]">{errors[`${r.productId}.qty`]}</p>}
                        </td>
                        <td className={td}>
                          {r.include ? (
                            <SelectField id={`rma-${r.productId}-reason`} value={r.reason} onChange={(v) => patch(r.productId, { reason: v })} options={RETURN_REASONS.map((x) => ({ value: x, label: x }))} placeholder="Choose a reason" invalid={!!errors[`${r.productId}.reason`]} />
                          ) : (
                            <span className="text-ink-faint">—</span>
                          )}
                          {errors[`${r.productId}.reason`] && <p className="mt-1 text-[11.5px] font-medium text-[#DC2626]">{errors[`${r.productId}.reason`]}</p>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {errors.lines && <p className="px-5 py-2 text-[12px] font-medium text-[#DC2626]">{errors.lines}</p>}
            </div>
          )}
        </FormSection>
        <FormSection title="Notes">
          <FormField label="Notes" htmlFor="rma-notes" className="sm:col-span-2 lg:col-span-3">
            <textarea id="rma-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={600} placeholder="Customer's description, photos received, courier pickup…" className={cn(fieldClass, "h-auto resize-y py-2 leading-5")} />
          </FormField>
        </FormSection>
        <StickyActions>
          <OutlineButton onClick={() => router.push(initialSo ? recordHref("salesOrders", initialSo) : ROUTES.salesReturns)}>Cancel</OutlineButton>
          <PrimaryButton onClick={() => void submit()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Create return"}
          </PrimaryButton>
        </StickyActions>
      </div>
    </PageShell>
  );
}
