"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EyeIcon, PaperclipIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DetailSkeleton, PrototypeNote, TextLink } from "@/components/shared/doc-ui";
import { FormSection, SESSION_NOTE, StickyActions } from "@/components/shared/form-kit";
import { fieldClass, FormField, OutlineButton, PageHeading, PageShell, PrimaryButton, SelectField, td, th } from "@/components/shared/inventory-ui";
import { ProductThumb } from "@/components/shared/product-thumb";
import { useNextNumber, useProducts, useRecords, useSaveRecord } from "@/hooks/use-operations";
import { warehouseLabel } from "@/lib/derive";
import { formatDate, formatNumber, toIsoDate } from "@/lib/format";
import { itemHref, recordHref, ROUTES } from "@/lib/routes";
import type { GoodsReceipt, PurchaseOrder } from "@/lib/types/operations";
import { cn } from "@/lib/utils";
import { vendorLabel } from "./po-columns";

const REJECT_REASONS = ["Damaged in transit", "Wrong item", "Failed quality check", "Short-dated / expired", "Other"].map((r) => ({ value: r, label: r }));

type Row = { productId: string; ordered: number; prior: number; outstanding: number; received: string; rejected: string; reason: string };

function rowsFor(po: PurchaseOrder): Row[] {
  return po.lines
    .filter((l) => l.quantity > l.received)
    .map((l) => ({ productId: l.productId, ordered: l.quantity, prior: l.received, outstanding: l.quantity - l.received, received: String(l.quantity - l.received), rejected: "0", reason: "" }));
}

export function ReceiptFormView({ poId: initialPo }: { poId?: string }) {
  const router = useRouter();
  const { data: pos } = useRecords("purchaseOrders");
  const { data: vendors } = useRecords("vendors");
  const { data: warehouses } = useRecords("warehouses");
  const { data: products } = useProducts();
  const { data: number } = useNextNumber("goodsReceipts");
  const save = useSaveRecord("goodsReceipts");
  const [poId, setPoId] = useState(initialPo ?? "");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [date, setDate] = useState(toIsoDate(new Date()));
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState(false);
  const crumbs = [{ label: "Purchasing" }, { label: "Goods Receipts", href: ROUTES.goodsReceipts }, { label: "New receipt" }];

  if (!pos || !products) return <DetailSkeleton crumbs={crumbs} />;

  const open = pos.filter((p) => p.status === "confirmed" || p.status === "partially-received");
  const po = open.find((p) => p.id === poId);
  const lines = rows ?? (po ? rowsFor(po) : []);
  const byId = new Map(products.map((p) => [p.id, p]));
  const n = (s: string) => (/^\d+$/.test(s.trim()) ? Number(s) : NaN);

  const choosePo = (id: string) => {
    setPoId(id);
    const p = open.find((x) => x.id === id);
    setRows(p ? rowsFor(p) : []);
    setErrors({});
  };
  const patch = (productId: string, p: Partial<Row>) => setRows(lines.map((r) => (r.productId === productId ? { ...r, ...p } : r)));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!po) e.po = "Choose a purchase order";
    if (!date) e.date = "Choose the received date";
    for (const r of lines) {
      const rec = n(r.received);
      const rej = n(r.rejected);
      if (Number.isNaN(rec)) e[`${r.productId}.received`] = "Whole number";
      else if (rec > r.outstanding) e[`${r.productId}.received`] = `Max ${r.outstanding}`;
      if (Number.isNaN(rej)) e[`${r.productId}.rejected`] = "Whole number";
      else if (!Number.isNaN(rec) && rej > rec) e[`${r.productId}.rejected`] = "More than received";
      if (rej > 0 && !r.reason) e[`${r.productId}.reason`] = "Choose a reason";
    }
    if (po && !e.po && lines.every((r) => !(n(r.received) > 0))) e.lines = "Enter a received quantity for at least one line";
    setErrors(e);
    if (Object.keys(e).length) toast.error("Check the receipt", { description: `${Object.keys(e).length} field(s) need attention.` });
    return Object.keys(e).length === 0;
  };

  const totalReceived = lines.reduce((s, r) => s + (n(r.received) || 0), 0);
  const totalRejected = lines.reduce((s, r) => s + (n(r.rejected) || 0), 0);
  const partial = lines.some((r) => (n(r.received) || 0) < r.outstanding);

  const saveDraft = async () => {
    if (!po || !validate()) return;
    const record: GoodsReceipt = {
      id: "",
      number: "",
      poId: po.id,
      vendorId: po.vendorId,
      warehouseId: po.warehouseId,
      receivedDate: date,
      status: "draft",
      lines: lines.map((r) => ({ productId: r.productId, expected: r.outstanding, received: n(r.received), rejected: n(r.rejected), rejectReason: n(r.rejected) > 0 ? r.reason : "" })),
      notes: notes.trim(),
      createdBy: "Admin User",
    };
    try {
      const saved = await save.mutateAsync(record);
      toast.success("Receipt saved as draft", { description: `${saved.number} · ${SESSION_NOTE} No stock movement posted.` });
      router.push(recordHref("goodsReceipts", saved.id));
    } catch (e) {
      toast.error("Couldn't save", { description: e instanceof Error ? e.message : undefined });
    }
  };

  const numInput = (r: Row, field: "received" | "rejected") => {
    const err = errors[`${r.productId}.${field}`];
    const id = `grn-${r.productId}-${field}`;
    return (
      <>
        <input id={id} value={r[field]} onChange={(e) => patch(r.productId, { [field]: e.target.value })} inputMode="numeric" aria-label={`${field === "received" ? "Received" : "Rejected"} quantity for ${byId.get(r.productId)?.name}`} aria-invalid={err ? true : undefined} className={cn(fieldClass, "text-right tabular-nums")} />
        {err && <p className="mt-1 text-right text-[11.5px] font-medium text-[#DC2626]">{err}</p>}
      </>
    );
  };

  return (
    <PageShell>
      <PageHeading crumbs={crumbs} title="New goods receipt" description={number ? `Will be saved as ${number} (draft).` : "Record what arrived against a purchase order."} />
      <div className="mt-5 space-y-4 pb-24">
        <PrototypeNote>Receipts are saved as drafts in this browser tab. Posting to stock is not available in this prototype: on-hand quantities and the purchase order&apos;s received figures stay unchanged.</PrototypeNote>
        <FormSection title="Purchase order">
          <FormField label="Purchase order" htmlFor="grn-po" required error={errors.po} hint={open.length ? `${open.length} confirmed or partially received orders` : "No orders are waiting for goods."}>
            <SelectField id="grn-po" value={poId} onChange={choosePo} options={open.map((p) => ({ value: p.id, label: `${p.number} · ${vendorLabel(vendors, p.vendorId)}` }))} placeholder="Choose a purchase order" invalid={!!errors.po} />
          </FormField>
          <FormField label="Received date" htmlFor="grn-date" required error={errors.date}>
            <input id="grn-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldClass} aria-invalid={errors.date ? true : undefined} />
          </FormField>
          {po && (
            <dl className="grid grid-cols-2 gap-3 rounded-lg bg-[#F9FAFB] px-3 py-2.5 text-[12.5px]">
              <div>
                <dt className="text-ink-muted">Vendor</dt>
                <dd className="font-medium text-ink">{vendorLabel(vendors, po.vendorId)}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Warehouse</dt>
                <dd className="font-medium text-ink">{warehouseLabel(warehouses, po.warehouseId)}</dd>
              </div>
            </dl>
          )}
        </FormSection>

        <FormSection title="Items received" description="Expected = still outstanding on the PO. Enter less for a partial receipt; record damaged or rejected units separately." flush>
          {!po ? (
            <p className="px-5 pb-5 text-[13px] text-ink-muted">Choose a purchase order to list its outstanding items.</p>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[920px] border-collapse">
                <caption className="sr-only">Items to receive</caption>
                <thead>
                  <tr className="border-y border-line-soft bg-[#FAFAFB]">
                    <th scope="col" className={th}>
                      Product
                    </th>
                    <th scope="col" className={cn(th, "text-right")}>
                      Ordered
                    </th>
                    <th scope="col" className={cn(th, "text-right")}>
                      Already received
                    </th>
                    <th scope="col" className={cn(th, "text-right")}>
                      Expected
                    </th>
                    <th scope="col" className={cn(th, "w-28 text-right")}>
                      Received
                    </th>
                    <th scope="col" className={cn(th, "w-28 text-right")}>
                      Rejected
                    </th>
                    <th scope="col" className={cn(th, "w-52")}>
                      Reject reason
                    </th>
                    <th scope="col" className={cn(th, "text-right")}>
                      Accepted
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((r) => {
                    const p = byId.get(r.productId);
                    const acc = (n(r.received) || 0) - (n(r.rejected) || 0);
                    return (
                      <tr key={r.productId} className="border-b border-line-soft align-top">
                        <td className={td}>
                          <span className="flex items-center gap-3">
                            {p && <ProductThumb icon={p.icon} src={p.image} size={30} />}
                            <span className="min-w-0">
                              <TextLink href={itemHref(r.productId)} className="block truncate">
                                {p?.name}
                              </TextLink>
                              <span className="block font-mono text-[12px] leading-4 text-ink-muted">{p?.sku}</span>
                            </span>
                          </span>
                        </td>
                        <td className={cn(td, "pt-5 text-right tabular-nums")}>{formatNumber(r.ordered)}</td>
                        <td className={cn(td, "pt-5 text-right tabular-nums")}>{formatNumber(r.prior)}</td>
                        <td className={cn(td, "pt-5 text-right font-medium text-ink tabular-nums")}>{formatNumber(r.outstanding)}</td>
                        <td className={td}>{numInput(r, "received")}</td>
                        <td className={td}>{numInput(r, "rejected")}</td>
                        <td className={td}>
                          <SelectField id={`grn-${r.productId}-reason`} value={r.reason} onChange={(v) => patch(r.productId, { reason: v })} options={REJECT_REASONS} placeholder={(n(r.rejected) || 0) > 0 ? "Choose reason" : "—"} invalid={!!errors[`${r.productId}.reason`]} />
                          {errors[`${r.productId}.reason`] && <p className="mt-1 text-[11.5px] font-medium text-[#DC2626]">{errors[`${r.productId}.reason`]}</p>}
                        </td>
                        <td className={cn(td, "pt-5 text-right font-semibold text-ink tabular-nums")}>{formatNumber(Math.max(0, acc))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {errors.lines && <p className="px-5 py-2 text-[12px] font-medium text-[#DC2626]">{errors.lines}</p>}
              {partial && <p className="px-5 py-2 text-[12.5px] text-ink-body">Partial receipt: some lines are below the expected quantity. The balance would stay outstanding on the PO.</p>}
            </div>
          )}
        </FormSection>

        <FormSection title="Notes & attachments">
          <FormField label="Notes" htmlFor="grn-notes" className="sm:col-span-2">
            <textarea id="grn-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={600} placeholder="Delivery note number, condition on arrival, who checked…" className={cn(fieldClass, "h-auto resize-y py-2 leading-5")} />
          </FormField>
          <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line bg-[#FAFAFB] px-4 py-5 text-center" aria-disabled="true">
            <PaperclipIcon size={20} aria-hidden className="text-ink-faint" />
            <p className="text-[13px] font-medium text-ink-body">Attachments</p>
            <p className="text-[12px] leading-4 text-ink-muted">Uploading delivery notes or photos isn&apos;t available in this prototype.</p>
          </div>
        </FormSection>

        <StickyActions note={po ? `${formatNumber(totalReceived)} received · ${formatNumber(totalRejected)} rejected` : undefined}>
          <OutlineButton onClick={() => router.push(initialPo ? recordHref("purchaseOrders", initialPo) : ROUTES.goodsReceipts)}>Cancel</OutlineButton>
          <OutlineButton icon={EyeIcon} disabled={!po} onClick={() => validate() && setPreview(true)}>
            Preview
          </OutlineButton>
          <PrimaryButton onClick={() => void saveDraft()} disabled={!po || save.isPending}>
            {save.isPending ? "Saving…" : "Save draft"}
          </PrimaryButton>
        </StickyActions>
      </div>

      {po && (
        <Dialog open={preview} onOpenChange={setPreview}>
          <DialogContent className="sm:max-w-xl">
            <DialogTitle className="pr-8 text-[17px] font-semibold text-ink">Receipt preview</DialogTitle>
            <DialogDescription className="text-[13px] text-ink-muted">
              {number} · {po.number} · {vendorLabel(vendors, po.vendorId)} · {warehouseLabel(warehouses, po.warehouseId)} · {formatDate(date)}
            </DialogDescription>
            <ul className="divide-y divide-line-soft rounded-lg border border-line text-[13px]">
              {lines.map((r) => (
                <li key={r.productId} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="min-w-0 truncate text-ink">{byId.get(r.productId)?.name}</span>
                  <span className="shrink-0 text-ink-muted tabular-nums">
                    {n(r.received) || 0} of {r.outstanding} received{(n(r.rejected) || 0) > 0 && ` · ${n(r.rejected)} rejected (${r.reason})`}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-[12.5px] leading-5 text-ink-muted">
              Status if posted in a live system: <span className="font-medium text-ink">{partial ? "Partially received" : "Received"}</span>. Here it will be saved as a draft only.
            </p>
            <div className="flex justify-end gap-2">
              <OutlineButton onClick={() => setPreview(false)}>Back to edit</OutlineButton>
              <PrimaryButton onClick={() => void saveDraft()} disabled={save.isPending}>
                Save draft
              </PrimaryButton>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </PageShell>
  );
}
