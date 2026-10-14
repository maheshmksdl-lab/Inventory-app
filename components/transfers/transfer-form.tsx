"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { PrototypeNote } from "@/components/shared/doc-ui";
import { ChoiceField, FormSection, SESSION_NOTE, StickyActions, TextAreaField, TextField, useZodForm } from "@/components/shared/form-kit";
import { OutlineButton, PageHeading, PageShell, PrimaryButton } from "@/components/shared/inventory-ui";
import { LineItemsEditor, newLine, validateLines, type LineDraft } from "@/components/shared/line-items";
import { useNextNumber, useProducts, useRecords, useSaveRecord } from "@/hooks/use-operations";
import { addDays, nowIso, toIsoDate } from "@/lib/format";
import { available } from "@/lib/inventory-meta";
import { recordHref, ROUTES } from "@/lib/routes";
import type { StockTransfer } from "@/lib/types/operations";

const schema = z
  .object({
    from: z.string().min(1, "Choose the source warehouse"),
    to: z.string().min(1, "Choose the destination warehouse"),
    expectedDate: z.string().min(1, "Choose an expected arrival date"),
    notes: z.string().max(600),
  })
  .refine((v) => !v.from || v.from !== v.to, { path: ["to"], message: "Destination must differ from the source" });
type Values = z.input<typeof schema>;

export function TransferFormView() {
  const router = useRouter();
  const { data: warehouses } = useRecords("warehouses");
  const { data: products } = useProducts();
  const { data: number } = useNextNumber("transfers");
  const save = useSaveRecord("transfers");
  const today = toIsoDate(new Date());
  const [lines, setLines] = useState<LineDraft[]>([newLine()]);
  const [lineErrors, setLineErrors] = useState<Record<string, string>>({});
  const [intent, setIntent] = useState<"draft" | "submitted">("draft");
  const form = useZodForm<Values>(schema, { from: "wh-main", to: "", expectedDate: addDays(today, 3), notes: "" }, "transfer");

  const availability = (productId: string) => {
    const p = products?.find((x) => x.id === productId);
    const b = p?.stock.find((s) => s.warehouseId === form.values.from);
    return b ? available(b) : 0;
  };
  const checkLines = () => {
    const errs = validateLines(lines, { availability });
    setLineErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = (status: "draft" | "submitted") => {
    setIntent(status);
    const linesOk = checkLines();
    form.handleSubmit(async (v) => {
      if (!linesOk) {
        toast.error("Check the product lines", { description: "Each line needs a product and a quantity within the available stock." });
        return;
      }
      const user = "Admin User";
      const at = nowIso();
      const record: StockTransfer = {
        id: "",
        number: "",
        from: v.from,
        to: v.to,
        createdDate: today,
        expectedDate: v.expectedDate,
        status,
        lines: lines.map((l) => ({ productId: l.productId, quantity: Number(l.quantity) })),
        notes: v.notes.trim(),
        createdBy: user,
        activity: [...(status === "submitted" ? [{ at, text: "Submitted for approval", user }] : []), { at, text: "Transfer created as draft", user }],
      };
      const saved = await save.mutateAsync(record);
      toast.success(status === "draft" ? "Transfer saved as draft" : "Transfer submitted for approval", { description: `${saved.number} · ${SESSION_NOTE} No stock has moved.` });
      router.push(recordHref("transfers", saved.id));
    })();
  };

  const whOptions = (warehouses ?? []).filter((w) => w.status === "active").map((w) => ({ value: w.id, label: w.name }));

  return (
    <PageShell>
      <PageHeading crumbs={[{ label: "Inventory" }, { label: "Stock Transfers", href: ROUTES.transfers }, { label: "New transfer" }]} title="New stock transfer" description={number ? `Will be saved as ${number}.` : "Request stock to move from one warehouse to another."} />
      <form noValidate onSubmit={(e) => {
          e.preventDefault();
          submit("submitted");
        }} className="mt-5 space-y-4 pb-24">
        <PrototypeNote>Saving creates a demo transfer record only. Quantities are checked against current available stock, but no stock is reserved or moved — not now, and not when the transfer is later marked received.</PrototypeNote>
        <FormSection title="Route" description="Where stock comes from and where it goes.">
          <ChoiceField form={form} name="from" label="From warehouse" required options={whOptions} placeholder="Choose source" />
          <ChoiceField form={form} name="to" label="To warehouse" required options={whOptions} placeholder="Choose destination" />
          <TextField form={form} name="expectedDate" label="Expected arrival" required type="date" min={today} />
          <TextAreaField form={form} name="notes" label="Notes" className="sm:col-span-2 lg:col-span-3" rows={2} placeholder="Reason for the transfer, handling instructions…" />
        </FormSection>
        <FormSection title="Products" description={`Available quantities are for ${warehouses?.find((w) => w.id === form.values.from)?.name ?? "the source warehouse"}.`} flush>
          {products && <LineItemsEditor lines={lines} onChange={setLines} products={products} opts={{ availability }} errors={lineErrors} idPrefix="transfer-line" />}
        </FormSection>
        <StickyActions note={`${lines.filter((l) => l.productId).length} product line(s) · ${lines.reduce((s, l) => s + (Number(l.quantity) || 0), 0)} units`}>
          <OutlineButton onClick={() => router.push(ROUTES.transfers)}>Cancel</OutlineButton>
          <OutlineButton onClick={() => submit("draft")} disabled={form.saving}>
            {form.saving && intent === "draft" ? "Saving…" : "Save draft"}
          </OutlineButton>
          <PrimaryButton type="submit" disabled={form.saving}>
            {form.saving && intent === "submitted" ? "Submitting…" : "Submit for approval"}
          </PrimaryButton>
        </StickyActions>
      </form>
    </PageShell>
  );
}
