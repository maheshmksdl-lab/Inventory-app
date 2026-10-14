"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { DetailSkeleton, MissingRecord, PrototypeNote, TotalsPanel } from "@/components/shared/doc-ui";
import { ChoiceField, FormSection, SESSION_NOTE, StickyActions, TextAreaField, TextField, useZodForm } from "@/components/shared/form-kit";
import { OutlineButton, PageHeading, PageShell, PrimaryButton } from "@/components/shared/inventory-ui";
import { LineItemsEditor, newLine, toNumberLine, validateLines, type LineDraft } from "@/components/shared/line-items";
import { useNextNumber, useProducts, useRecord, useRecords, useSaveRecord } from "@/hooks/use-operations";
import { docTotals, taxRateOf } from "@/lib/doc-math";
import { addDays, nowIso, toIsoDate } from "@/lib/format";
import { recordHref, ROUTES } from "@/lib/routes";
import type { ProductRow } from "@/lib/types/inventory";
import type { PurchaseOrder } from "@/lib/types/operations";

const schema = z
  .object({
    vendorId: z.string().min(1, "Choose a vendor"),
    warehouseId: z.string().min(1, "Choose the receiving warehouse"),
    orderDate: z.string().min(1, "Choose the order date"),
    expectedDate: z.string().min(1, "Choose an expected delivery date"),
    notes: z.string().max(600),
  })
  .refine((v) => !v.orderDate || !v.expectedDate || v.expectedDate >= v.orderDate, { path: ["expectedDate"], message: "Delivery can't be before the order date" });
type Values = z.input<typeof schema>;

export interface PoPrefill {
  vendor?: string;
  warehouse?: string;
  /** "productId:qty,productId:qty" from Reorder Alerts. */
  lines?: string;
}

function PoForm({ existing, prefill, products }: { existing: PurchaseOrder | null; prefill: PoPrefill; products: ProductRow[] }) {
  const router = useRouter();
  const { data: vendors } = useRecords("vendors");
  const { data: warehouses } = useRecords("warehouses");
  const { data: number } = useNextNumber("purchaseOrders");
  const save = useSaveRecord("purchaseOrders");
  const today = toIsoDate(new Date());
  const [intent, setIntent] = useState<"draft" | "pending-approval">("draft");
  const [lineErrors, setLineErrors] = useState<Record<string, string>>({});
  const form = useZodForm<Values>(
    schema,
    {
      vendorId: existing?.vendorId ?? prefill.vendor ?? "",
      warehouseId: existing?.warehouseId ?? prefill.warehouse ?? "wh-main",
      orderDate: existing?.orderDate ?? today,
      expectedDate: existing?.expectedDate ?? addDays(today, 7),
      notes: existing?.notes ?? (prefill.lines ? "Raised from Reorder Alerts." : ""),
    },
    "po",
  );
  const vendorId = form.values.vendorId;
  const priceFor = (p: ProductRow) => p.suppliers.find((s) => s.vendorId === vendorId)?.lastCost ?? p.costPrice;

  const [lines, setLines] = useState<LineDraft[]>(() => {
    if (existing) return existing.lines.map((l) => newLine({ productId: l.productId, quantity: String(l.quantity), unitPrice: String(l.unitPrice), taxRate: String(l.taxRate), discount: String(l.discount) }));
    const pre = (prefill.lines ?? "")
      .split(",")
      .map((s) => s.split(":"))
      .map(([id, qty]) => ({ p: products.find((x) => x.id === id), qty }))
      .filter((x) => x.p && /^\d+$/.test(x.qty ?? ""));
    if (pre.length) {
      const vend = prefill.vendor ?? "";
      return pre.map(({ p, qty }) => newLine({ productId: p!.id, quantity: qty, unitPrice: String(p!.suppliers.find((s) => s.vendorId === vend)?.lastCost ?? p!.costPrice), taxRate: String(taxRateOf(p!.taxClass)) }));
    }
    return [newLine()];
  });

  const opts = { price: "cost" as const, priceFor };
  const totals = docTotals(lines.filter((l) => l.productId).map(toNumberLine));

  const submit = (status: "draft" | "pending-approval") => {
    setIntent(status);
    const errs = validateLines(lines, opts);
    setLineErrors(errs);
    form.handleSubmit(async (v) => {
      if (Object.keys(errs).length) {
        toast.error("Check the product lines", { description: "Each line needs a product, a quantity and a unit cost." });
        return;
      }
      const at = nowIso();
      const user = "Admin User";
      const log = existing ? [{ at, text: status === "pending-approval" ? "Edited and submitted for approval" : "Draft edited", user }] : [...(status === "pending-approval" ? [{ at, text: "Submitted for approval", user }] : []), { at, text: "Purchase order created as draft", user }];
      const record: PurchaseOrder = {
        id: existing?.id ?? "",
        number: existing?.number ?? "",
        vendorId: v.vendorId,
        warehouseId: v.warehouseId,
        orderDate: v.orderDate,
        expectedDate: v.expectedDate,
        status,
        lines: lines.map((l) => ({ ...toNumberLine(l), received: 0 })),
        notes: v.notes.trim(),
        createdBy: existing?.createdBy ?? user,
        activity: [...log, ...(existing?.activity ?? [])],
      };
      const saved = await save.mutateAsync(record);
      toast.success(status === "draft" ? "Purchase order saved as draft" : "Submitted for approval", { description: `${saved.number} · ${SESSION_NOTE} Stock is not affected.` });
      router.push(recordHref("purchaseOrders", saved.id));
    })();
  };

  const vendorOptions = (vendors ?? []).filter((x) => x.status === "active" || x.id === vendorId).map((x) => ({ value: x.id, label: `${x.name} · ${x.code}` }));
  const vendor = vendors?.find((x) => x.id === vendorId);

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit("pending-approval");
      }}
      className="mt-5 space-y-4 pb-24"
    >
      <PrototypeNote>This saves a demo purchase order in your browser tab. Nothing is sent to the vendor, and creating or confirming a PO never increases stock.</PrototypeNote>
      <FormSection title="Order details" description={existing ? `Editing ${existing.number}` : number ? `Will be saved as ${number}` : undefined}>
        <ChoiceField form={form} name="vendorId" label="Vendor" required options={vendorOptions} placeholder="Choose a vendor" hint={vendor ? `${vendor.paymentTerms} · ${vendor.contactName}` : undefined} />
        <ChoiceField form={form} name="warehouseId" label="Deliver to" required options={(warehouses ?? []).filter((w) => w.status === "active").map((w) => ({ value: w.id, label: w.name }))} />
        <TextField form={form} name="orderDate" label="Order date" required type="date" />
        <TextField form={form} name="expectedDate" label="Expected delivery" required type="date" min={form.values.orderDate} />
        <TextAreaField form={form} name="notes" label="Notes" className="sm:col-span-2" rows={2} placeholder="Delivery instructions, quote reference…" />
      </FormSection>
      <FormSection title="Items" description={vendor ? `Unit cost defaults to ${vendor.name}'s last cost where known; tax follows each item's tax class.` : "Choose a vendor first to default unit costs."} flush>
        <LineItemsEditor lines={lines} onChange={setLines} products={products} opts={opts} errors={lineErrors} idPrefix="po-line" />
        <div className="border-t border-line-soft px-5 py-4">
          <TotalsPanel totals={totals} />
        </div>
      </FormSection>
      <StickyActions note={existing ? `Editing ${existing.number}` : "New purchase order"}>
        <OutlineButton onClick={() => router.push(existing ? recordHref("purchaseOrders", existing.id) : ROUTES.purchaseOrders)}>Cancel</OutlineButton>
        <OutlineButton onClick={() => submit("draft")} disabled={form.saving}>
          {form.saving && intent === "draft" ? "Saving…" : "Save draft"}
        </OutlineButton>
        <PrimaryButton type="submit" disabled={form.saving}>
          {form.saving && intent === "pending-approval" ? "Submitting…" : "Submit for approval"}
        </PrimaryButton>
      </StickyActions>
    </form>
  );
}

export function PoFormView({ editId, prefill = {} }: { editId?: string; prefill?: PoPrefill }) {
  const { data: products } = useProducts();
  const { data: existing, isError } = useRecord("purchaseOrders", editId ?? "");
  const crumbs = [{ label: "Purchasing" }, { label: "Purchase Orders", href: ROUTES.purchaseOrders }, { label: editId ? (existing?.number ?? "Edit") : "New purchase order" }];

  if (editId && isError) return <MissingRecord crumbs={crumbs} noun="purchase order" backHref={ROUTES.purchaseOrders} backLabel="Back to Purchase Orders" />;
  if (!products || (editId && !existing)) return <DetailSkeleton crumbs={crumbs} />;
  if (existing && existing.status !== "draft")
    return <MissingRecord crumbs={crumbs} noun="draft purchase order" backHref={recordHref("purchaseOrders", existing.id)} backLabel={`Back to ${existing.number}`} />;

  return (
    <PageShell>
      <PageHeading crumbs={crumbs} title={existing ? `Edit ${existing.number}` : "New purchase order"} description="Order stock from a vendor. Receiving is recorded later on a goods receipt." />
      <PoForm key={existing?.id ?? "new"} existing={existing ?? null} prefill={prefill} products={products} />
    </PageShell>
  );
}
