"use client";

import { useEffect, useState, type ReactNode } from "react";
import { InfoIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Card, ConfirmDialog, fieldClass, FormField, OutlineButton, PrimaryButton, SelectField } from "@/components/shared/inventory-ui";
import { useLookups } from "@/hooks/use-inventory";
import { ApiError } from "@/lib/api/inventory";
import { formatCurrency } from "@/lib/format";
import { ITEM_TYPE_LABEL } from "@/lib/inventory-meta";
import { itemFormSchema, toItemInput, type ItemFormValues, type ItemInput } from "@/lib/schemas/item";
import type { Product } from "@/lib/types/inventory";
import { cn } from "@/lib/utils";

export const EMPTY_ITEM: ItemFormValues = {
  name: "",
  sku: "",
  description: "",
  category: "",
  brand: "",
  type: "stocked",
  barcode: "",
  unit: "pcs",
  taxClass: "GST 18%",
  costPrice: "",
  sellingPrice: "",
  reorderPoint: "0",
  lifecycle: "active",
};

export function toFormValues(p: Product): ItemFormValues {
  return {
    name: p.name,
    sku: p.sku,
    description: p.description,
    category: p.category,
    brand: p.brand,
    type: p.type,
    barcode: p.barcode,
    unit: p.unit,
    taxClass: p.taxClass,
    costPrice: String(p.costPrice),
    sellingPrice: String(p.sellingPrice),
    reorderPoint: String(p.reorderPoint),
    lifecycle: p.lifecycle === "inactive" ? "inactive" : "active",
  };
}

const VALIDATION_TOAST = "item-form-validation";

type Errors = Partial<Record<keyof ItemFormValues, string>>;

const FIELD_ORDER: (keyof ItemFormValues)[] = ["name", "sku", "category", "brand", "type", "barcode", "unit", "description", "costPrice", "sellingPrice", "taxClass", "reorderPoint", "lifecycle"];

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <Card className="grid gap-5 p-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
      <div>
        <h2 className="text-[15px] leading-6 font-semibold text-ink">{title}</h2>
        <p className="mt-0.5 text-[12.5px] leading-5 text-ink-muted">{description}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </Card>
  );
}

/**
 * Create / edit an item. Values are validated in the browser; saving writes to
 * the in-memory demo store only (nothing is sent to a server).
 */
export function ItemForm({
  mode,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  notice,
}: {
  mode: "create" | "edit";
  initial: ItemFormValues;
  submitLabel: string;
  onSubmit: (input: ItemInput) => Promise<unknown>;
  onCancel: () => void;
  notice?: ReactNode;
}) {
  const { data: lookups } = useLookups();
  const [values, setValues] = useState<ItemFormValues>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);

  // Warn before closing the tab with unsaved edits.
  useEffect(() => {
    if (!dirty || saving) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, saving]);

  const validate = (v: ItemFormValues): Errors => {
    const r = itemFormSchema.safeParse(v);
    if (r.success) return {};
    const out: Errors = {};
    for (const issue of r.error.issues) {
      const k = issue.path[0] as keyof ItemFormValues;
      if (!out[k]) out[k] = issue.message;
    }
    return out;
  };

  const set = <K extends keyof ItemFormValues>(key: K, v: ItemFormValues[K]) => {
    const next = { ...values, [key]: v };
    setValues(next);
    // After the first submit, errors update as the user types.
    if (submitted) setErrors(validate(next));
  };

  const focusFirst = (errs: Errors) => {
    const first = FIELD_ORDER.find((k) => errs[k]);
    if (first) requestAnimationFrame(() => document.getElementById(`item-${first}`)?.focus());
  };

  const submit = async () => {
    setSubmitted(true);
    const errs = validate(values);
    setErrors(errs);
    if (Object.keys(errs).length) {
      focusFirst(errs);
      toast.error("Check the highlighted fields", { id: VALIDATION_TOAST, description: `${Object.keys(errs).length} field${Object.keys(errs).length === 1 ? " needs" : "s need"} attention.` });
      return;
    }
    toast.dismiss(VALIDATION_TOAST);
    setSaving(true);
    try {
      await onSubmit(toItemInput(values));
    } catch (e) {
      if (e instanceof ApiError && e.field) {
        const errs2 = { [e.field]: e.message } as Errors;
        setErrors(errs2);
        focusFirst(errs2);
      } else {
        toast.error("Couldn't save the item", { description: e instanceof Error ? e.message : "Please try again." });
      }
      setSaving(false);
    }
  };

  const cancel = () => (dirty ? setConfirmLeave(true) : onCancel());

  const input = (key: keyof ItemFormValues, props: React.ComponentProps<"input"> = {}) => (
    <input
      id={`item-${key}`}
      value={values[key]}
      onChange={(e) => set(key, e.target.value as never)}
      aria-invalid={errors[key] ? true : undefined}
      aria-describedby={errors[key] ? `item-${key}-error` : undefined}
      className={fieldClass}
      {...props}
    />
  );

  const select = (key: keyof ItemFormValues, options: { value: string; label: string }[], placeholder: string) => (
    <SelectField id={`item-${key}`} value={values[key]} onChange={(v) => set(key, v as never)} options={options} placeholder={placeholder} invalid={!!errors[key]} />
  );

  const cost = Number(values.costPrice);
  const price = Number(values.sellingPrice);
  const pricesValid = values.costPrice !== "" && values.sellingPrice !== "" && !errors.costPrice && !errors.sellingPrice && Number.isFinite(cost) && Number.isFinite(price);
  const margin = pricesValid && price > 0 ? ((price - cost) / price) * 100 : null;
  const opt = (list: string[] | undefined) => (list ?? []).map((v) => ({ value: v, label: v }));

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="mt-5 space-y-4 pb-24"
    >
      <div className="flex gap-2.5 rounded-xl border border-line bg-white px-4 py-3 text-[13px] leading-5 text-ink-body" role="note">
        <InfoIcon size={18} aria-hidden className="mt-px shrink-0 text-ink-muted" />
        <p>
          {notice ?? "Frontend demo: saving updates this browser tab only. Changes are not sent to a server and reset when the page reloads."}
        </p>
      </div>

      <Section title="Basic information" description="How the item is named, identified and grouped.">
        <FormField label="Product name" htmlFor="item-name" error={errors.name} required className="sm:col-span-2">
          {input("name", { placeholder: "e.g. Wireless Headphones", autoComplete: "off", maxLength: 120 })}
        </FormField>
        <FormField label="SKU" htmlFor="item-sku" error={errors.sku} required hint="Unique stock-keeping code. Letters, numbers and hyphens.">
          {input("sku", { placeholder: "e.g. WH-1000XM5", autoComplete: "off", className: cn(fieldClass, "font-mono uppercase") })}
        </FormField>
        <FormField label="Barcode" htmlFor="item-barcode" error={errors.barcode} hint="EAN / UPC, 8–14 digits. Optional.">
          {input("barcode", { placeholder: "e.g. 8904471000107", inputMode: "numeric", autoComplete: "off", className: cn(fieldClass, "font-mono") })}
        </FormField>
        <FormField label="Category" htmlFor="item-category" error={errors.category} required>
          {select("category", opt(lookups?.categories), "Choose a category")}
        </FormField>
        <FormField label="Brand" htmlFor="item-brand" error={errors.brand} required>
          {select("brand", opt(lookups?.brands), "Choose a brand")}
        </FormField>
        <FormField label="Item type" htmlFor="item-type" error={errors.type} required>
          {select(
            "type",
            (Object.keys(ITEM_TYPE_LABEL) as (keyof typeof ITEM_TYPE_LABEL)[]).map((k) => ({ value: k, label: ITEM_TYPE_LABEL[k] })),
            "Choose a type",
          )}
        </FormField>
        <FormField label="Unit of measurement" htmlFor="item-unit" error={errors.unit} required>
          {select("unit", opt(lookups?.units), "Choose a unit")}
        </FormField>
        <FormField label="Description" htmlFor="item-description" error={errors.description} hint={`${values.description.length}/600`} className="sm:col-span-2">
          <textarea
            id="item-description"
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            rows={3}
            maxLength={600}
            aria-invalid={errors.description ? true : undefined}
            placeholder="What it is, key specifications, what's in the box…"
            className={cn(fieldClass, "h-auto min-h-[84px] resize-y py-2 leading-5")}
          />
        </FormField>
      </Section>

      <Section title="Pricing & tax" description="Cost is what you pay suppliers; selling price is what customers pay.">
        <FormField label="Cost price (₹)" htmlFor="item-costPrice" error={errors.costPrice} required>
          {input("costPrice", { inputMode: "decimal", placeholder: "0.00", className: cn(fieldClass, "tabular-nums") })}
        </FormField>
        <FormField
          label="Selling price (₹)"
          htmlFor="item-sellingPrice"
          error={errors.sellingPrice}
          required
          hint={
            margin === null ? undefined : price < cost ? (
              <span className="font-medium text-[var(--warning)]">Selling price is below cost ({formatCurrency(price - cost, { decimals: true })} per unit).</span>
            ) : (
              `Margin ${margin.toFixed(1)}% · ${formatCurrency(price - cost, { decimals: true })} per unit`
            )
          }
        >
          {input("sellingPrice", { inputMode: "decimal", placeholder: "0.00", className: cn(fieldClass, "tabular-nums") })}
        </FormField>
        <FormField label="Tax classification" htmlFor="item-taxClass" error={errors.taxClass} required>
          {select("taxClass", opt(lookups?.taxClasses), "Choose a tax class")}
        </FormField>
      </Section>

      <Section title="Stock settings" description="When to reorder, and whether the item is in use.">
        <FormField label="Reorder point" htmlFor="item-reorderPoint" error={errors.reorderPoint} required hint="Item-level threshold across all warehouses. Each warehouse keeps its own reorder point.">
          {input("reorderPoint", { inputMode: "numeric", placeholder: "0", className: cn(fieldClass, "tabular-nums") })}
        </FormField>
        <FormField label="Product status" htmlFor="item-lifecycle" error={errors.lifecycle} required hint="Inactive items stay on record but aren't counted as low or out of stock.">
          {select(
            "lifecycle",
            [
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ],
            "Choose a status",
          )}
        </FormField>
        {mode === "create" && (
          <p className="rounded-lg bg-[#F9FAFB] px-3 py-2.5 text-[12.5px] leading-5 text-ink-body sm:col-span-2">
            New items start with no stock. Opening stock will be recorded through Goods Receipts or Stock Adjustments, which are coming soon.
          </p>
        )}
      </Section>

      {/* Sticky action bar */}
      <div className="fixed right-0 bottom-0 left-0 z-20 border-t border-line bg-white/95 backdrop-blur lg:left-[var(--sidebar-w)] lg:group-data-[sidebar=collapsed]/shell:left-[var(--sidebar-w-collapsed)]">
        <div className="mx-auto flex max-w-[1600px] items-center justify-end gap-2 px-4 py-3 sm:px-6 lg:px-8">
          <span className="mr-auto hidden text-[12.5px] text-ink-muted sm:block" aria-live="polite">
            {dirty ? "Unsaved changes" : "No changes yet"}
          </span>
          <OutlineButton onClick={cancel}>Cancel</OutlineButton>
          <PrimaryButton type="submit" disabled={saving || (mode === "edit" && !dirty)}>
            {saving ? "Saving…" : submitLabel}
          </PrimaryButton>
        </div>
      </div>

      <ConfirmDialog
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        title="Discard your changes?"
        description="You have unsaved changes to this item. If you leave now, they will be lost."
        confirmLabel="Discard changes"
        onConfirm={() => {
          setConfirmLeave(false);
          onCancel();
        }}
      />
    </form>
  );
}
