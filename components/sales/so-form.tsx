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
import { docTotals } from "@/lib/doc-math";
import { addDays, nowIso, toIsoDate } from "@/lib/format";
import { available } from "@/lib/inventory-meta";
import { recordHref, ROUTES } from "@/lib/routes";
import type { ProductRow } from "@/lib/types/inventory";
import type { SalesOrder } from "@/lib/types/operations";

const schema = z
  .object({
    customerId: z.string().min(1, "Choose a customer"),
    warehouseId: z.string().min(1, "Choose the shipping warehouse"),
    orderDate: z.string().min(1, "Choose the order date"),
    deliveryDate: z.string().min(1, "Choose a requested delivery date"),
    notes: z.string().max(600),
  })
  .refine((v) => !v.orderDate || !v.deliveryDate || v.deliveryDate >= v.orderDate, { path: ["deliveryDate"], message: "Delivery can't be before the order date" });
type Values = z.input<typeof schema>;

function SoForm({ existing, customer, products }: { existing: SalesOrder | null; customer?: string; products: ProductRow[] }) {
  const router = useRouter();
  const { data: customers } = useRecords("customers");
  const { data: warehouses } = useRecords("warehouses");
  const { data: number } = useNextNumber("salesOrders");
  const save = useSaveRecord("salesOrders");
  const today = toIsoDate(new Date());
  const [lineErrors, setLineErrors] = useState<Record<string, string>>({});
  const [lines, setLines] = useState<LineDraft[]>(() =>
    existing ? existing.lines.map((l) => newLine({ productId: l.productId, quantity: String(l.quantity), unitPrice: String(l.unitPrice), taxRate: String(l.taxRate), discount: String(l.discount) })) : [newLine()],
  );
  const form = useZodForm<Values>(
    schema,
    { customerId: existing?.customerId ?? customer ?? "", warehouseId: existing?.warehouseId ?? "wh-main", orderDate: existing?.orderDate ?? today, deliveryDate: existing?.deliveryDate ?? addDays(today, 5), notes: existing?.notes ?? "" },
    "so",
  );
  const availability = (productId: string) => {
    const b = products.find((p) => p.id === productId)?.stock.find((s) => s.warehouseId === form.values.warehouseId);
    return b ? available(b) : 0;
  };
  const opts = { price: "sell" as const, discount: true, availability, availabilityInfoOnly: true };
  const totals = docTotals(lines.filter((l) => l.productId).map(toNumberLine));
  const cust = customers?.find((c) => c.id === form.values.customerId);

  const submit = () => {
    const errs = validateLines(lines, opts);
    setLineErrors(errs);
    form.handleSubmit(async (v) => {
      if (Object.keys(errs).length) {
        toast.error("Check the product lines", { description: "Each line needs a product, a quantity and a price." });
        return;
      }
      const at = nowIso();
      const user = "Admin User";
      const record: SalesOrder = {
        id: existing?.id ?? "",
        number: existing?.number ?? "",
        customerId: v.customerId,
        warehouseId: v.warehouseId,
        orderDate: v.orderDate,
        deliveryDate: v.deliveryDate,
        status: "draft",
        lines: lines.map((l) => ({ ...toNumberLine(l), fulfilled: 0 })),
        notes: v.notes.trim(),
        createdBy: existing?.createdBy ?? user,
        activity: [{ at, text: existing ? "Draft edited" : "Sales order created as draft", user }, ...(existing?.activity ?? [])],
      };
      const saved = await save.mutateAsync(record);
      toast.success(existing ? "Draft updated" : "Sales order saved as draft", { description: `${saved.number} · ${SESSION_NOTE} No stock reserved.` });
      router.push(recordHref("salesOrders", saved.id));
    })();
  };

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="mt-5 space-y-4 pb-24"
    >
      <PrototypeNote>Orders are saved as drafts in this browser tab. Confirming later is a demo status change: stock is never reserved, picked or dispatched for real.</PrototypeNote>
      <FormSection title="Order details" description={existing ? `Editing ${existing.number}` : number ? `Will be saved as ${number}` : undefined}>
        <ChoiceField
          form={form}
          name="customerId"
          label="Customer"
          required
          options={(customers ?? []).filter((c) => c.status === "active" || c.id === form.values.customerId).map((c) => ({ value: c.id, label: `${c.name} · ${c.code}` }))}
          placeholder="Choose a customer"
          hint={cust ? `Ships to: ${cust.shippingAddress}` : undefined}
        />
        <ChoiceField form={form} name="warehouseId" label="Ship from" required options={(warehouses ?? []).filter((w) => w.status === "active").map((w) => ({ value: w.id, label: w.name }))} />
        <TextField form={form} name="orderDate" label="Order date" required type="date" />
        <TextField form={form} name="deliveryDate" label="Requested delivery" required type="date" min={form.values.orderDate} />
        <TextAreaField form={form} name="notes" label="Notes" className="sm:col-span-2" rows={2} placeholder="Customer PO reference, delivery window…" />
      </FormSection>
      <FormSection title="Items" description="Prices default to each item's selling price. Discount is a percentage; tax follows the item's tax class." flush>
        <LineItemsEditor lines={lines} onChange={setLines} products={products} opts={opts} errors={lineErrors} idPrefix="so-line" />
        <div className="border-t border-line-soft px-5 py-4">
          <TotalsPanel totals={totals} />
        </div>
      </FormSection>
      <StickyActions note={existing ? `Editing ${existing.number}` : "New sales order"}>
        <OutlineButton onClick={() => router.push(existing ? recordHref("salesOrders", existing.id) : ROUTES.salesOrders)}>Cancel</OutlineButton>
        <PrimaryButton type="submit" disabled={form.saving}>
          {form.saving ? "Saving…" : "Save draft"}
        </PrimaryButton>
      </StickyActions>
    </form>
  );
}

export function SoFormView({ editId, customer }: { editId?: string; customer?: string }) {
  const { data: products } = useProducts();
  const { data: existing, isError } = useRecord("salesOrders", editId ?? "");
  const crumbs = [{ label: "Sales & Fulfilment" }, { label: "Sales Orders", href: ROUTES.salesOrders }, { label: editId ? (existing?.number ?? "Edit") : "New sales order" }];
  if (editId && isError) return <MissingRecord crumbs={crumbs} noun="sales order" backHref={ROUTES.salesOrders} backLabel="Back to Sales Orders" />;
  if (!products || (editId && !existing)) return <DetailSkeleton crumbs={crumbs} />;
  if (existing && existing.status !== "draft") return <MissingRecord crumbs={crumbs} noun="draft sales order" backHref={recordHref("salesOrders", existing.id)} backLabel={`Back to ${existing.number}`} />;
  return (
    <PageShell>
      <PageHeading crumbs={crumbs} title={existing ? `Edit ${existing.number}` : "New sales order"} description="Record what a customer has ordered. Fulfilment happens in Pick, Pack & Ship." />
      <SoForm key={existing?.id ?? "new"} existing={existing ?? null} customer={customer} products={products} />
    </PageShell>
  );
}
