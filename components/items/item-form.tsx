"use client";

import { useEffect, useMemo, useState, type ComponentProps, type ReactNode } from "react";
import type { Icon } from "@phosphor-icons/react";
import { CubeIcon, InfoIcon, PackageIcon, PlusIcon, StackIcon, TrashIcon, WrenchIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { CatalogEntryDialog } from "@/components/catalog/catalog-view";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, ConfirmDialog, fieldClass, FormField, IconButton, OutlineButton, PrimaryButton, SelectField } from "@/components/shared/inventory-ui";
import { ProductThumb } from "@/components/shared/product-thumb";
import { useLookups } from "@/hooks/use-inventory";
import { useProducts } from "@/hooks/use-operations";
import { ApiError } from "@/lib/api/inventory";
import { formatCurrency } from "@/lib/format";
import { ITEM_TYPE_HINT, ITEM_TYPE_LABEL, TRACKING_LABEL, VALUATION_LABEL } from "@/lib/inventory-meta";
import { WAREHOUSES } from "@/lib/mock-data/warehouses";
import { validateItem, type ItemFormErrors, type ItemFormValues } from "@/lib/schemas/item";
import type { ItemAttribute, ItemType, Product, TrackingMode } from "@/lib/types/inventory";
import { cn } from "@/lib/utils";
import { ImageManager } from "./image-manager";

export const EMPTY_ITEM: ItemFormValues = {
  type: "goods",
  name: "",
  sku: "",
  unit: "pcs",
  category: "",
  brand: "",
  manufacturer: "",
  returnable: true,
  length: "",
  width: "",
  height: "",
  dimensionUnit: "cm",
  weight: "",
  weightUnit: "kg",
  barcode: "",
  mpn: "",
  isbn: "",
  hsnCode: "",
  sellable: true,
  sellingPrice: "",
  salesAccount: "Sales",
  description: "",
  purchasable: true,
  costPrice: "",
  purchaseAccount: "Cost of Goods Sold",
  purchaseDescription: "",
  preferredVendorId: "",
  taxClass: "GST 18%",
  trackInventory: true,
  inventoryAccount: "Inventory Asset",
  valuationMethod: "fifo",
  tracking: "none",
  reorderPoint: "0",
  openingStock: Object.fromEntries(WAREHOUSES.map((w) => [w.id, ""])),
  openingRate: "",
  lifecycle: "active",
  images: [],
  components: [],
  attributes: [],
  variantValues: {},
};

/** Defaults when switching type on a new item, so each type starts sensibly. */
export function emptyItemOfType(type: ItemType): ItemFormValues {
  if (type === "service") return { ...EMPTY_ITEM, type, unit: "hrs", returnable: false, trackInventory: false, purchasable: false, inventoryAccount: "" };
  if (type === "composite") return { ...EMPTY_ITEM, type, unit: "set", components: [{ productId: "", quantity: "1" }] };
  return { ...EMPTY_ITEM, type };
}

const str = (n: number | undefined | null) => (n === undefined || n === null ? "" : String(n));

export function toFormValues(p: Product): ItemFormValues {
  return {
    type: p.type,
    name: p.name,
    sku: p.sku,
    unit: p.unit,
    category: p.category,
    brand: p.brand,
    manufacturer: p.manufacturer,
    returnable: p.returnable,
    length: str(p.dimensions?.length),
    width: str(p.dimensions?.width),
    height: str(p.dimensions?.height),
    dimensionUnit: p.dimensions?.unit ?? "cm",
    weight: str(p.weight?.value),
    weightUnit: p.weight?.unit ?? "kg",
    barcode: p.barcode,
    mpn: p.mpn,
    isbn: p.isbn,
    hsnCode: p.hsnCode,
    sellable: p.sellable,
    sellingPrice: p.sellable ? String(p.sellingPrice) : "",
    salesAccount: p.salesAccount || "Sales",
    description: p.description,
    purchasable: p.purchasable,
    costPrice: p.purchasable ? String(p.costPrice) : "",
    purchaseAccount: p.purchaseAccount || "Cost of Goods Sold",
    purchaseDescription: p.purchaseDescription,
    preferredVendorId: p.preferredVendorId,
    taxClass: p.taxClass,
    trackInventory: p.trackInventory,
    inventoryAccount: p.inventoryAccount || (p.trackInventory ? "Inventory Asset" : ""),
    valuationMethod: p.valuationMethod,
    tracking: p.tracking,
    reorderPoint: String(p.reorderPoint),
    openingStock: {},
    openingRate: "",
    lifecycle: p.lifecycle === "inactive" ? "inactive" : "active",
    images: p.images,
    components: p.components.map((c) => ({ productId: c.productId, quantity: String(c.quantity) })),
    attributes: p.attributes,
    variantValues: p.variantValues,
  };
}

/** A copy of an item for "Clone": same details, new name / SKU / codes, no stock or variants. */
export function toCloneValues(p: Product): ItemFormValues {
  return {
    ...toFormValues(p),
    name: `${p.name} (copy)`,
    sku: "",
    barcode: "",
    isbn: "",
    attributes: [],
    variantValues: {},
    openingStock: EMPTY_ITEM.openingStock,
    lifecycle: "active",
  };
}

/** The values a new variant starts from: the parent's details, without its identity. */
export function toVariantValues(parent: Product): ItemFormValues {
  return {
    ...toFormValues(parent),
    name: "",
    sku: "",
    barcode: "",
    mpn: "",
    isbn: "",
    images: [],
    attributes: [],
    variantValues: Object.fromEntries(parent.attributes.map((a) => [a.name, ""])),
    openingStock: EMPTY_ITEM.openingStock,
    lifecycle: "active",
  };
}

const VALIDATION_TOAST = "item-form-validation";
const fid = (key: string) => `item-${key.replace(/[^A-Za-z0-9-]/g, "-")}`;
const MAX_ATTRIBUTES = 3;

// ── Layout pieces ────────────────────────────────────────────────────

function Section({ title, description, children, toggle, id }: { title: string; description: string; children: ReactNode; toggle?: ReactNode; id?: string }) {
  return (
    <Card className="grid gap-5 p-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
      <div>
        {toggle ?? (
          <h2 id={id} className="text-[15px] leading-6 font-semibold text-ink">
            {title}
          </h2>
        )}
        <p className="mt-0.5 text-[12.5px] leading-5 text-ink-muted">{description}</p>
      </div>
      <div className="grid content-start gap-4 sm:grid-cols-2">{children}</div>
    </Card>
  );
}

/** Section title with an on / off checkbox, as Zoho's Sales / Purchase / Track Inventory headers. */
function SectionToggle({ id, title, checked, onChange, disabled }: { id: string; title: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label htmlFor={id} className={cn("flex items-center gap-2.5", disabled ? "cursor-not-allowed" : "cursor-pointer")}>
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} disabled={disabled} />
      <span className="text-[15px] leading-6 font-semibold text-ink">{title}</span>
    </label>
  );
}

function Off({ children }: { children: ReactNode }) {
  return <p className="rounded-lg bg-[#F9FAFB] px-3 py-2.5 text-[12.5px] leading-5 text-ink-muted sm:col-span-2">{children}</p>;
}

/** Text input with a fixed prefix or suffix (₹, cm, kg…). */
function AddonInput({ addon, after, invalid, className, ...props }: ComponentProps<"input"> & { addon?: ReactNode; after?: ReactNode; invalid?: boolean }) {
  return (
    <div className={cn("flex min-w-0 rounded-lg", className)}>
      {addon && <span className="inline-flex h-9 shrink-0 items-center rounded-l-lg border border-r-0 border-line bg-[#F9FAFB] px-2.5 text-[12.5px] font-medium text-ink-body">{addon}</span>}
      <input aria-invalid={invalid || undefined} className={cn(fieldClass, "min-w-0 tabular-nums", addon && "rounded-l-none", after && "rounded-r-none")} {...props} />
      {after}
    </div>
  );
}

/** Small native select used as an input suffix (units). */
function UnitSelect<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: readonly T[]; label: string }) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="h-9 shrink-0 rounded-r-lg border border-l-0 border-line bg-[#F9FAFB] px-2 text-[12.5px] font-medium text-ink-body outline-none focus-visible:ring-3 focus-visible:ring-brand-10"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

const TYPE_ICON: Record<ItemType, Icon> = { goods: PackageIcon, service: WrenchIcon, composite: StackIcon };

function TypePicker({ value, onChange, locked }: { value: ItemType; onChange: (t: ItemType) => void; locked: boolean }) {
  const types: ItemType[] = locked ? [value] : ["goods", "service", "composite"];
  return (
    <fieldset className="sm:col-span-2">
      <legend className="mb-1.5 text-field-label text-ink-body">
        Item type<span className="ml-0.5 text-[#DC2626]" aria-hidden>*</span>
      </legend>
      <div className={cn("grid gap-2", !locked && "sm:grid-cols-3")} role="radiogroup">
        {types.map((t) => {
          const IconCmp = TYPE_ICON[t];
          const on = value === t;
          return (
            <label
              key={t}
              className={cn(
                "flex items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-action",
                on ? "border-brand-soft bg-brand-surface" : "border-line bg-white hover:border-[#D0D5DD]",
                locked ? "cursor-default" : "cursor-pointer",
              )}
            >
              <input type="radio" name="item-type" value={t} checked={on} onChange={() => onChange(t)} disabled={locked} className="sr-only" />
              <span className={cn("mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full", on ? "bg-inventory-surface text-inventory" : "bg-[#F2F4F7] text-[#475467]")} aria-hidden>
                <IconCmp size={15} weight={on ? "fill" : "regular"} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] leading-5 font-semibold text-ink">{ITEM_TYPE_LABEL[t]}</span>
                <span className="block text-[12px] leading-4 text-ink-muted">{locked ? "The item type can't be changed after the item is created." : ITEM_TYPE_HINT[t]}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Option chips for a variant attribute: type and press Enter or comma to add. */
function OptionsInput({ id, options, onChange, locked, invalid }: { id: string; options: string[]; onChange: (o: string[]) => void; locked: string[]; invalid?: boolean }) {
  const [draft, setDraft] = useState("");
  const commit = () => {
    const v = draft.trim().replace(/,$/, "").trim();
    if (!v) return;
    if (v.length > 40) return toast.error("Keep each option under 40 characters");
    if (options.some((o) => o.toLowerCase() === v.toLowerCase())) return toast.error(`“${v}” is already an option`);
    onChange([...options, v]);
    setDraft("");
  };
  return (
    <div className={cn("flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border bg-white px-2 py-1.5 focus-within:border-brand-hover focus-within:ring-3 focus-within:ring-brand-10", invalid ? "border-[#DC2626]" : "border-line")}>
      {options.map((o) => (
        <span key={o} className="inline-flex items-center gap-1 rounded-md bg-[#F2F4F7] py-0.5 pr-1 pl-2 text-[12.5px] text-ink">
          {o}
          {!locked.includes(o) ? (
            <button type="button" onClick={() => onChange(options.filter((x) => x !== o))} aria-label={`Remove ${o}`} className="rounded text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-action">
              <XIcon size={12} weight="bold" aria-hidden />
            </button>
          ) : (
            <span className="sr-only">(used by a variant)</span>
          )}
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(e) => (e.target.value.endsWith(",") ? (setDraft(e.target.value), setTimeout(commit)) : setDraft(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Backspace" && !draft && options.length && !locked.includes(options[options.length - 1])) onChange(options.slice(0, -1));
        }}
        onBlur={commit}
        aria-invalid={invalid || undefined}
        placeholder={options.length ? "Add another…" : "Type an option and press Enter"}
        className="h-6 min-w-[140px] flex-1 border-0 bg-transparent px-1 text-[13px] text-ink outline-none placeholder:text-ink-faint"
      />
    </div>
  );
}

// ── Form ─────────────────────────────────────────────────────────────

export interface VariantContext {
  parentName: string;
  attributes: ItemAttribute[];
}

/**
 * Create / edit an item (or add a variant). Which sections and fields show
 * depends on the item type, following Zoho Inventory. Saving writes to the
 * in-memory demo store only (nothing is sent to a server).
 */
export function ItemForm({
  mode,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  notice,
  variantOf,
  selfId,
  usedOptions = {},
  hasVariants,
}: {
  mode: "create" | "edit";
  initial: ItemFormValues;
  submitLabel: string;
  onSubmit: (values: ItemFormValues) => Promise<unknown>;
  onCancel: () => void;
  notice?: ReactNode;
  /** Set when the item is (or will be) a variant: its family's attributes. */
  variantOf?: VariantContext;
  selfId?: string;
  /** Attribute options already used by variants: they can't be removed. */
  usedOptions?: Record<string, string[]>;
  /** Editing a parent whose variants exist: attributes can be extended but not removed. */
  hasVariants?: boolean;
}) {
  const { data: lookups } = useLookups();
  const { data: allProducts } = useProducts();
  const [values, setValues] = useState<ItemFormValues>(initial);
  const [errors, setErrors] = useState<ItemFormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [newEntry, setNewEntry] = useState<"categories" | "brands" | null>(null);
  // Variant name and SKU follow the chosen values until the user edits them.
  const [autoIdentity, setAutoIdentity] = useState(mode === "create" && !!variantOf && !initial.name);
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);
  const editing = mode === "edit";
  const isVariant = !!variantOf;
  const { type } = values;
  const service = type === "service";

  useEffect(() => {
    if (!dirty || saving) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, saving]);

  // A parent item gives its own value for each attribute it defines; a variant for each family attribute.
  const validate = (v: ItemFormValues) => {
    const errs = validateItem(v, { variantAttributes: isVariant ? variantOf.attributes.map((a) => a.name) : v.attributes.map((a) => a.name.trim()).filter(Boolean) });
    if (!isVariant)
      v.attributes.forEach((a) => {
        const own = v.variantValues[a.name.trim()];
        if (own && !a.options.includes(own)) errs[`variantValues.${a.name.trim()}`] ??= `Pick one of the ${a.name.toLowerCase()} options`;
      });
    return errs;
  };

  const update = (next: ItemFormValues) => {
    setValues(next);
    if (submitted) setErrors(validate(next));
  };
  const set = <K extends keyof ItemFormValues>(key: K, v: ItemFormValues[K]) => update({ ...values, [key]: v });

  const setVariantValue = (attr: string, v: string) => {
    const variantValues = { ...values.variantValues, [attr]: v };
    let next = { ...values, variantValues };
    if (autoIdentity && variantOf) {
      const parts = variantOf.attributes.map((a) => variantValues[a.name]?.trim()).filter(Boolean);
      const parentSku = allProducts?.find((p) => p.name === variantOf.parentName)?.sku ?? "";
      next = {
        ...next,
        name: parts.length ? `${variantOf.parentName} - ${parts.join(" / ")}` : "",
        sku: parts.length && parentSku ? `${parentSku}-${parts.map((x) => x.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase()).join("-")}` : next.sku,
      };
    }
    update(next);
  };

  const changeType = (t: ItemType) => {
    if (t === type) return;
    // Keep what's shared (name, SKU, category, images…) and reset type-specific parts.
    const base = emptyItemOfType(t);
    update({ ...base, name: values.name, sku: values.sku, category: values.category, brand: t === "service" ? "" : values.brand, manufacturer: values.manufacturer, images: values.images, description: values.description, sellingPrice: values.sellingPrice, costPrice: values.costPrice, taxClass: values.taxClass, hsnCode: "" });
  };

  const submit = async () => {
    setSubmitted(true);
    const errs = validate(values);
    setErrors(errs);
    const n = Object.keys(errs).length;
    if (n) {
      requestAnimationFrame(() => (document.querySelector('form[data-item-form] [aria-invalid="true"]') as HTMLElement | null)?.focus());
      toast.error("Check the highlighted fields", { id: VALIDATION_TOAST, description: `${n} field${n === 1 ? " needs" : "s need"} attention.` });
      return;
    }
    toast.dismiss(VALIDATION_TOAST);
    setSaving(true);
    try {
      await onSubmit(values);
    } catch (e) {
      if (e instanceof ApiError && e.field) {
        setErrors({ [e.field]: e.message });
        requestAnimationFrame(() => document.getElementById(fid(e.field!))?.focus());
        toast.error(e.message);
      } else {
        toast.error("Couldn't save the item", { description: e instanceof Error ? e.message : "Please try again." });
      }
      setSaving(false);
    }
  };

  const cancel = () => (dirty ? setConfirmLeave(true) : onCancel());

  const err = (key: string) => errors[key];
  const input = (key: keyof ItemFormValues & string, props: ComponentProps<"input"> = {}) => (
    <input
      id={fid(key)}
      value={String(values[key] ?? "")}
      onChange={(e) => set(key, e.target.value as never)}
      aria-invalid={err(key) ? true : undefined}
      aria-describedby={err(key) ? `${fid(key)}-error` : undefined}
      {...props}
      className={cn(fieldClass, props.className)}
    />
  );
  const select = (key: keyof ItemFormValues & string, options: { value: string; label: string }[], placeholder: string) => (
    <SelectField id={fid(key)} value={String(values[key] ?? "")} onChange={(v) => set(key, v as never)} options={options} placeholder={placeholder} invalid={!!err(key)} />
  );
  const field = (key: string, label: string, child: ReactNode, opts: { required?: boolean; hint?: ReactNode; className?: string } = {}) => (
    <FormField label={label} htmlFor={fid(key)} error={err(key)} hint={opts.hint} required={opts.required} className={opts.className}>
      {child}
    </FormField>
  );

  // An item may sit in a category or brand that has since been archived: keep it selectable.
  const opt = (list: string[] | undefined, current?: string, labels?: Record<string, string>) =>
    [...(list ?? []), ...(current && list && !list.includes(current) ? [current] : [])].map((v) => ({ value: v, label: labels?.[v] ?? v }));

  const cost = Number(values.costPrice);
  const price = Number(values.sellingPrice);
  const pricesValid = values.sellable && values.purchasable && values.costPrice !== "" && values.sellingPrice !== "" && !err("costPrice") && !err("sellingPrice") && Number.isFinite(cost) && Number.isFinite(price);
  const margin = pricesValid && price > 0 ? ((price - cost) / price) * 100 : null;

  // Composite components: goods and services that are not composite themselves.
  const componentChoices = useMemo(() => (allProducts ?? []).filter((p) => p.type !== "composite" && p.lifecycle === "active" && p.id !== selfId), [allProducts, selfId]);
  const byId = useMemo(() => new Map((allProducts ?? []).map((p) => [p.id, p])), [allProducts]);
  const componentCost = values.components.reduce((s, c) => s + (byId.get(c.productId)?.costPrice ?? 0) * (Number(c.quantity) || 0), 0);
  const setComponent = (i: number, patch: Partial<ItemFormValues["components"][number]>) => set("components", values.components.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  const setAttribute = (i: number, patch: Partial<ItemAttribute>) => {
    const prev = values.attributes[i];
    const attributes = values.attributes.map((a, j) => (j === i ? { ...a, ...patch } : a));
    const variantValues = { ...values.variantValues };
    if (patch.name !== undefined && patch.name !== prev.name) {
      variantValues[patch.name.trim()] = variantValues[prev.name.trim()] ?? "";
      delete variantValues[prev.name.trim()];
    }
    update({ ...values, attributes, variantValues });
  };
  const savedAttributeNames = new Set(initial.attributes.map((a) => a.name));

  const openingTotal = Object.values(values.openingStock).reduce((s, q) => s + (Number(q) || 0), 0);
  const trackLocked = editing || isVariant || service;
  const showGoodsFields = !service;

  return (
    <form
      noValidate
      data-item-form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="mt-5 space-y-4 pb-24"
    >
      <div className="flex gap-2.5 rounded-xl border border-line bg-white px-4 py-3 text-[13px] leading-5 text-ink-body" role="note">
        <InfoIcon size={18} aria-hidden className="mt-px shrink-0 text-ink-muted" />
        <p>{notice ?? "Frontend demo: saving updates this browser tab only. Changes and uploaded images are not sent to a server and reset when the page reloads."}</p>
      </div>

      {/* Identity and images, side by side as in Zoho */}
      <Card className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
        <div className="grid content-start gap-4 sm:grid-cols-2">
          {isVariant ? (
            <p className="flex items-center gap-2 rounded-lg bg-[#F9FAFB] px-3 py-2.5 text-[12.5px] leading-5 text-ink-body sm:col-span-2">
              <CubeIcon size={16} className="shrink-0 text-ink-muted" aria-hidden />
              <span>
                Variant of <span className="font-semibold text-ink">{variantOf.parentName}</span>. Variants are goods and share the family&apos;s attributes.
              </span>
            </p>
          ) : (
            <TypePicker value={type} onChange={changeType} locked={editing} />
          )}
          {field(
            "name",
            "Name",
            input("name", {
              placeholder: service ? "e.g. Annual Maintenance Visit" : type === "composite" ? "e.g. Work-from-home Starter Kit" : "e.g. Wireless Headphones",
              autoComplete: "off",
              maxLength: 120,
              onChange: (e) => {
                setAutoIdentity(false);
                set("name", e.target.value);
              },
            }),
            { required: true, className: "sm:col-span-2" },
          )}
          {field(
            "sku",
            "SKU",
            input("sku", {
              placeholder: "e.g. WH-1000XM5",
              autoComplete: "off",
              className: "font-mono uppercase",
              onChange: (e) => {
                setAutoIdentity(false);
                set("sku", e.target.value);
              },
            }),
            { required: true, hint: "Unique stock-keeping code. Letters, numbers and hyphens." },
          )}
          {field("unit", "Unit", select("unit", opt(lookups?.units, initial.unit), "Choose a unit"), { required: true, hint: service ? "Usually hrs for time-based services." : undefined })}
          <FormField label="Category" htmlFor={fid("category")} error={err("category")} required>
            <div className="flex gap-2">
              <div className="min-w-0 flex-1">{select("category", opt(lookups?.categories, initial.category, lookups?.categoryLabels), "Select a category")}</div>
              <OutlineButton aria-label="New category" title="New category" className="w-9 px-0" onClick={() => setNewEntry("categories")}>
                <PlusIcon size={15} aria-hidden />
              </OutlineButton>
            </div>
          </FormField>
          {!service && (
            <FormField label="Brand" htmlFor={fid("brand")} error={err("brand")}>
              <div className="flex gap-2">
                <div className="min-w-0 flex-1">
                  <SelectField
                    id={fid("brand")}
                    value={values.brand || "__none"}
                    onChange={(v) => set("brand", v === "__none" ? "" : v)}
                    options={[{ value: "__none", label: "No brand" }, ...opt(lookups?.brands, initial.brand)]}
                    placeholder="Select a brand"
                  />
                </div>
                <OutlineButton aria-label="New brand" title="New brand" className="w-9 px-0" onClick={() => setNewEntry("brands")}>
                  <PlusIcon size={15} aria-hidden />
                </OutlineButton>
              </div>
            </FormField>
          )}
          {!service &&
            field(
              "manufacturer",
              "Manufacturer",
              <>
                {input("manufacturer", { list: "item-manufacturer-list", placeholder: "Select or type to add", autoComplete: "off", maxLength: 80 })}
                <datalist id="item-manufacturer-list">
                  {lookups?.manufacturers.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </>,
            )}
          {!service && (
            <fieldset className="grid content-start gap-1.5">
              <legend className="mb-1.5 text-field-label text-ink-body">Returnable item</legend>
              <div className="flex h-9 items-center gap-5">
                {[
                  { v: true, l: "Yes" },
                  { v: false, l: "No" },
                ].map((o) => (
                  <label key={o.l} className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-ink">
                    <input type="radio" name="item-returnable" checked={values.returnable === o.v} onChange={() => set("returnable", o.v)} className="size-4 accent-[var(--inventory)]" />
                    {o.l}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </div>
        <div className="min-w-0">
          <h2 className="mb-2 text-[13px] leading-5 font-semibold text-ink">Images</h2>
          <ImageManager images={values.images} onChange={(images) => set("images", images)} name={values.name} />
        </div>
      </Card>

      {/* Variant values (adding or editing a variant) */}
      {isVariant && (
        <Section title="Attributes" description={`Choose this variant's values, or type a new one to add it to ${variantOf.parentName}'s options.`}>
          {variantOf.attributes.map((a) => {
            const key = `variantValues.${a.name}`;
            return (
              <FormField key={a.name} label={a.name} htmlFor={fid(key)} error={err(key)} required>
                <input
                  id={fid(key)}
                  list={`${fid(key)}-list`}
                  value={values.variantValues[a.name] ?? ""}
                  onChange={(e) => setVariantValue(a.name, e.target.value)}
                  aria-invalid={err(key) ? true : undefined}
                  aria-describedby={err(key) ? `${fid(key)}-error` : undefined}
                  placeholder="Select or add"
                  autoComplete="off"
                  className={fieldClass}
                />
                <datalist id={`${fid(key)}-list`}>
                  {a.options.map((o) => (
                    <option key={o} value={o} />
                  ))}
                </datalist>
              </FormField>
            );
          })}
        </Section>
      )}

      {/* Variant attributes defined on a parent goods item */}
      {type === "goods" && !isVariant && (
        <Section
          title="Variants"
          description="Sell this item in versions such as colour or size. Each variant is its own item with its own SKU, price, stock and images."
          toggle={
            <SectionToggle
              id={fid("has-variants")}
              title="Variants"
              checked={values.attributes.length > 0}
              disabled={hasVariants}
              onChange={(on) => update({ ...values, attributes: on ? [{ name: "", options: [] }] : [], variantValues: {} })}
            />
          }
        >
          {values.attributes.length === 0 ? (
            <Off>This item has no variants. Turn on Variants to define attributes like Colour or Size, then add variants from the item&apos;s page.</Off>
          ) : (
            <>
              {values.attributes.map((a, i) => {
                const nameKey = `attributes.${i}.name`;
                const optKey = `attributes.${i}.options`;
                const ownKey = `variantValues.${a.name.trim()}`;
                const locked = hasVariants && savedAttributeNames.has(a.name);
                return (
                  <div key={i} className="grid gap-3 rounded-lg border border-line-soft bg-[#FCFCFD] p-3 sm:col-span-2 sm:grid-cols-[180px_minmax(0,1fr)_170px_auto] sm:items-start">
                    {field(nameKey, "Attribute", <input id={fid(nameKey)} value={a.name} onChange={(e) => setAttribute(i, { name: e.target.value })} disabled={locked} maxLength={30} placeholder="e.g. Colour" aria-invalid={err(nameKey) ? true : undefined} className={fieldClass} />, { required: true })}
                    {field(optKey, "Options", <OptionsInput id={fid(optKey)} options={a.options} onChange={(options) => setAttribute(i, { options })} locked={usedOptions[a.name] ?? []} invalid={!!err(optKey)} />, { required: true })}
                    <FormField label="This item's value" htmlFor={fid(ownKey)} error={err(ownKey)} required>
                      <SelectField id={fid(ownKey)} value={values.variantValues[a.name.trim()] ?? ""} onChange={(v) => set("variantValues", { ...values.variantValues, [a.name.trim()]: v })} options={a.options.map((o) => ({ value: o, label: o }))} placeholder="Choose" invalid={!!err(ownKey)} />
                    </FormField>
                    <IconButton
                      aria-label={`Remove attribute ${a.name || i + 1}`}
                      className="mt-0 sm:mt-6"
                      disabled={locked}
                      onClick={() => {
                        const variantValues = { ...values.variantValues };
                        delete variantValues[a.name.trim()];
                        update({ ...values, attributes: values.attributes.filter((_, j) => j !== i), variantValues });
                      }}
                    >
                      <TrashIcon size={16} aria-hidden />
                    </IconButton>
                  </div>
                );
              })}
              <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                <OutlineButton icon={PlusIcon} className="h-8" disabled={values.attributes.length >= MAX_ATTRIBUTES} onClick={() => set("attributes", [...values.attributes, { name: "", options: [] }])}>
                  Add attribute
                </OutlineButton>
                <span className="text-[12px] text-ink-muted">Up to {MAX_ATTRIBUTES} attributes.{hasVariants && " Attributes used by existing variants can't be removed."}</span>
              </div>
            </>
          )}
        </Section>
      )}

      {/* Composite: components */}
      {type === "composite" && (
        <Section title="Components" description="The items that make up one unit of this composite item. Components can be goods or services.">
          <div className="grid gap-2 sm:col-span-2">
            {values.components.map((c, i) => {
              const p = byId.get(c.productId);
              const pk = `components.${i}.productId`;
              const qk = `components.${i}.quantity`;
              const choices = componentChoices.filter((x) => x.id === c.productId || !values.components.some((o) => o.productId === x.id));
              return (
                <div key={i} className="grid grid-cols-[36px_minmax(0,1fr)_96px_32px] items-start gap-2">
                  <span className="mt-0.5">{p ? <ProductThumb icon={p.icon} src={p.image} size={32} /> : <ProductThumb icon="box" size={32} />}</span>
                  <FormField label={i === 0 ? "Item" : ""} htmlFor={fid(pk)} error={err(pk)} className={cn(i > 0 && "[&>label]:sr-only")}>
                    <SelectField id={fid(pk)} value={c.productId} onChange={(v) => setComponent(i, { productId: v })} options={choices.map((x) => ({ value: x.id, label: `${x.name} · ${x.sku}` }))} placeholder="Choose an item" invalid={!!err(pk)} />
                  </FormField>
                  <FormField label={i === 0 ? "Quantity" : ""} htmlFor={fid(qk)} error={err(qk)} className={cn(i > 0 && "[&>label]:sr-only")}>
                    <input id={fid(qk)} value={c.quantity} onChange={(e) => setComponent(i, { quantity: e.target.value })} inputMode="decimal" aria-invalid={err(qk) ? true : undefined} className={cn(fieldClass, "text-right tabular-nums")} aria-label={i > 0 ? `Quantity of component ${i + 1}` : undefined} />
                  </FormField>
                  <IconButton aria-label={`Remove component ${p?.name ?? i + 1}`} className={cn(i === 0 && "mt-6")} onClick={() => set("components", values.components.filter((_, j) => j !== i))}>
                    <TrashIcon size={16} aria-hidden />
                  </IconButton>
                </div>
              );
            })}
            {err("components") && (
              <p id={`${fid("components")}-error`} className="text-[12px] leading-4 font-medium text-[#DC2626]">
                {err("components")}
              </p>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <OutlineButton id={fid("components")} icon={PlusIcon} className="h-8" aria-invalid={err("components") ? true : undefined} onClick={() => set("components", [...values.components, { productId: "", quantity: "1" }])}>
                Add component
              </OutlineButton>
              {componentCost > 0 && (
                <span className="text-[12.5px] text-ink-body">
                  Components cost <span className="font-semibold text-ink tabular-nums">{formatCurrency(componentCost, { decimals: true })}</span> per unit
                  {values.purchasable && Number(values.costPrice) !== componentCost && (
                    <>
                      {" · "}
                      <button type="button" onClick={() => set("costPrice", componentCost.toFixed(2))} className="rounded font-medium text-brand hover:text-brand-press focus-visible:outline-2 focus-visible:outline-brand-action">
                        Use as cost price
                      </button>
                    </>
                  )}
                </span>
              )}
            </div>
          </div>
        </Section>
      )}

      {/* Packed size and identifiers (goods and composite items) */}
      {showGoodsFields && (
        <Section title="Fulfilment details" description="Packed size and weight for shipping, and the codes printed on the product or its box.">
          <FormField label="Dimensions (L × W × H)" htmlFor={fid("length")} error={err("length")} className="sm:col-span-2">
            <div className="grid max-w-[520px] min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5">
              <input id={fid("length")} value={values.length} onChange={(e) => set("length", e.target.value)} inputMode="decimal" placeholder="Length" aria-invalid={err("length") ? true : undefined} className={cn(fieldClass, "min-w-0 tabular-nums")} />
              <span className="text-ink-faint" aria-hidden>
                ×
              </span>
              <input aria-label="Width" value={values.width} onChange={(e) => set("width", e.target.value)} inputMode="decimal" placeholder="Width" aria-invalid={err("length") ? true : undefined} className={cn(fieldClass, "min-w-0 tabular-nums")} />
              <span className="text-ink-faint" aria-hidden>
                ×
              </span>
              <div className="flex min-w-0">
                <input aria-label="Height" value={values.height} onChange={(e) => set("height", e.target.value)} inputMode="decimal" placeholder="Height" aria-invalid={err("length") ? true : undefined} className={cn(fieldClass, "min-w-0 rounded-r-none tabular-nums")} />
                <UnitSelect label="Dimension unit" value={values.dimensionUnit} onChange={(v) => set("dimensionUnit", v)} options={["cm", "in"] as const} />
              </div>
            </div>
          </FormField>
          {field(
            "weight",
            "Weight",
            <AddonInput id={fid("weight")} value={values.weight} onChange={(e) => set("weight", e.target.value)} inputMode="decimal" placeholder="0.00" invalid={!!err("weight")} after={<UnitSelect label="Weight unit" value={values.weightUnit} onChange={(v) => set("weightUnit", v)} options={["kg", "g", "lb", "oz"] as const} />} />,
          )}
          {field("barcode", "UPC / EAN", input("barcode", { placeholder: "e.g. 8904471000107", inputMode: "numeric", autoComplete: "off", className: "font-mono" }), { hint: "8–14 digits. Used for barcode labels and scanning." })}
          {field("mpn", "MPN", input("mpn", { placeholder: "Manufacturer part number", autoComplete: "off", maxLength: 40, className: "font-mono" }))}
          {field("isbn", "ISBN", input("isbn", { placeholder: "For books: 10 or 13 digits", autoComplete: "off", className: "font-mono" }))}
        </Section>
      )}

      {/* Sales information */}
      <Section
        title="Sales information"
        description="Price and account used when this item is sold."
        toggle={<SectionToggle id={fid("sellable")} title="Sales information" checked={values.sellable} onChange={(on) => set("sellable", on)} />}
      >
        {err("sellable") && (
          <p id={`${fid("sellable")}-error`} className="text-[12px] leading-4 font-medium text-[#DC2626] sm:col-span-2">
            {err("sellable")}
          </p>
        )}
        {values.sellable ? (
          <>
            {field(
              "sellingPrice",
              "Selling price",
              <AddonInput id={fid("sellingPrice")} addon="INR" value={values.sellingPrice} onChange={(e) => set("sellingPrice", e.target.value)} inputMode="decimal" placeholder="0.00" invalid={!!err("sellingPrice")} aria-describedby={err("sellingPrice") ? `${fid("sellingPrice")}-error` : undefined} />,
              {
                required: true,
                hint:
                  margin === null ? (service ? `Per ${values.unit || "unit"}` : undefined) : price < cost ? (
                    <span className="font-medium text-[var(--warning)]">Selling price is below cost ({formatCurrency(price - cost, { decimals: true })} per unit).</span>
                  ) : (
                    `Margin ${margin.toFixed(1)}% · ${formatCurrency(price - cost, { decimals: true })} per unit`
                  ),
              },
            )}
            {field("salesAccount", "Account", select("salesAccount", opt(lookups?.salesAccounts, initial.salesAccount), "Choose an account"), { required: true })}
            <FormField label="Description" htmlFor={fid("description")} error={err("description")} hint={`Shown to customers on sales documents · ${values.description.length}/600`} className="sm:col-span-2">
              <textarea
                id={fid("description")}
                value={values.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                maxLength={600}
                aria-invalid={err("description") ? true : undefined}
                placeholder={service ? "What the service covers, how it's billed…" : "What it is, key specifications, what's in the box…"}
                className={cn(fieldClass, "h-auto min-h-[84px] resize-y py-2 leading-5")}
              />
            </FormField>
          </>
        ) : (
          <Off>Not sold. The item won&apos;t be offered on sales orders.</Off>
        )}
      </Section>

      {/* Purchase information */}
      <Section
        title="Purchase information"
        description="Cost, account and preferred vendor used when this item is bought."
        toggle={<SectionToggle id={fid("purchasable")} title="Purchase information" checked={values.purchasable} onChange={(on) => set("purchasable", on)} />}
      >
        {values.purchasable ? (
          <>
            {field("costPrice", "Cost price", <AddonInput id={fid("costPrice")} addon="INR" value={values.costPrice} onChange={(e) => set("costPrice", e.target.value)} inputMode="decimal" placeholder="0.00" invalid={!!err("costPrice")} aria-describedby={err("costPrice") ? `${fid("costPrice")}-error` : undefined} />, { required: true })}
            {field("purchaseAccount", "Account", select("purchaseAccount", opt(lookups?.purchaseAccounts, initial.purchaseAccount), "Choose an account"), { required: true })}
            {field(
              "preferredVendorId",
              "Preferred vendor",
              <SelectField
                id={fid("preferredVendorId")}
                value={values.preferredVendorId || "__none"}
                onChange={(v) => set("preferredVendorId", v === "__none" ? "" : v)}
                options={[{ value: "__none", label: "No preferred vendor" }, ...(lookups?.vendors ?? []).map((v) => ({ value: v.id, label: v.name }))]}
                placeholder="Choose a vendor"
              />,
            )}
            <FormField label="Description" htmlFor={fid("purchaseDescription")} error={err("purchaseDescription")} hint={`Shown on purchase orders · ${values.purchaseDescription.length}/600`} className="sm:col-span-2">
              <textarea
                id={fid("purchaseDescription")}
                value={values.purchaseDescription}
                onChange={(e) => set("purchaseDescription", e.target.value)}
                rows={2}
                maxLength={600}
                aria-invalid={err("purchaseDescription") ? true : undefined}
                className={cn(fieldClass, "h-auto min-h-[64px] resize-y py-2 leading-5")}
              />
            </FormField>
          </>
        ) : (
          <Off>Not bought. The item won&apos;t be offered on purchase orders.</Off>
        )}
      </Section>

      {/* Tax */}
      <Section title="Tax" description={service ? "GST rate and SAC code for this service." : "GST rate and HSN code for this item."}>
        {field("taxClass", "Tax rate", select("taxClass", opt(lookups?.taxClasses, initial.taxClass), "Choose a tax rate"), { required: true })}
        {field("hsnCode", service ? "SAC code" : "HSN code", input("hsnCode", { inputMode: "numeric", autoComplete: "off", placeholder: service ? "6 digits, e.g. 998732" : "4–8 digits, e.g. 8518", className: "font-mono" }))}
      </Section>

      {/* Inventory tracking (not for services) */}
      {!service && (
        <Section
          title="Track inventory"
          description={trackLocked ? "You can't turn inventory tracking on or off once the item exists." : "Track stock levels, valuation and reorder alerts for this item."}
          toggle={<SectionToggle id={fid("trackInventory")} title="Track inventory for this item" checked={values.trackInventory} onChange={(on) => set("trackInventory", on)} disabled={trackLocked} />}
        >
          {values.trackInventory ? (
            <>
              {field("inventoryAccount", "Inventory account", select("inventoryAccount", opt(lookups?.inventoryAccounts, initial.inventoryAccount), "Select an account"), { required: true })}
              {field(
                "valuationMethod",
                "Inventory valuation method",
                select(
                  "valuationMethod",
                  (["fifo", "weighted-average"] as const).map((v) => ({ value: v, label: VALUATION_LABEL[v] })),
                  "Choose a method",
                ),
                { required: true },
              )}
              {field("reorderPoint", "Reorder point", input("reorderPoint", { inputMode: "numeric", placeholder: "0", className: "tabular-nums" }), { required: true, hint: "Alert when available stock across all warehouses falls to this level." })}
              <fieldset className="grid content-start gap-1.5">
                <legend className="mb-1.5 text-field-label text-ink-body">Advanced tracking</legend>
                <div className="flex min-h-9 flex-wrap items-center gap-x-5 gap-y-2">
                  {(["none", "serial", "batch"] as TrackingMode[]).map((t) => (
                    <label key={t} className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-ink">
                      <input type="radio" name="item-tracking" checked={values.tracking === t} onChange={() => set("tracking", t)} className="size-4 accent-[var(--inventory)]" />
                      {TRACKING_LABEL[t]}
                    </label>
                  ))}
                </div>
              </fieldset>
              {mode === "create" && (
                <div className="grid gap-3 rounded-lg border border-line-soft bg-[#FCFCFD] p-3 sm:col-span-2">
                  <div>
                    <h3 className="text-[13px] leading-5 font-semibold text-ink">Opening stock</h3>
                    <p className="text-[12px] leading-4 text-ink-muted">Stock you already hold. It&apos;s recorded as an Opening stock adjustment in each warehouse.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-4">
                    {WAREHOUSES.map((w) => {
                      const key = `openingStock.${w.id}`;
                      return (
                        <FormField key={w.id} label={w.name} htmlFor={fid(key)} error={err(key)}>
                          <input
                            id={fid(key)}
                            value={values.openingStock[w.id] ?? ""}
                            onChange={(e) => set("openingStock", { ...values.openingStock, [w.id]: e.target.value })}
                            inputMode="numeric"
                            placeholder="0"
                            aria-invalid={err(key) ? true : undefined}
                            className={cn(fieldClass, "tabular-nums")}
                          />
                        </FormField>
                      );
                    })}
                    {field(
                      "openingRate",
                      "Rate per unit",
                      <AddonInput id={fid("openingRate")} addon="INR" value={values.openingRate} onChange={(e) => set("openingRate", e.target.value)} inputMode="decimal" placeholder={values.purchasable && values.costPrice ? values.costPrice : "0.00"} invalid={!!err("openingRate")} />,
                      { hint: values.purchasable ? "Defaults to the cost price." : undefined },
                    )}
                  </div>
                  {openingTotal > 0 && (
                    <p className="text-[12.5px] text-ink-body">
                      Total opening stock: <span className="font-semibold text-ink tabular-nums">{openingTotal}</span> {values.unit}
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <Off>{editing ? "Stock isn't tracked for this item." : "Stock won't be tracked. Turn this on to record quantities, valuation and reorder alerts."}</Off>
          )}
        </Section>
      )}

      <Section title="Status" description="Inactive items stay on record but aren't sold, bought or counted as low or out of stock.">
        {field(
          "lifecycle",
          "Item status",
          select(
            "lifecycle",
            [
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ],
            "Choose a status",
          ),
          { required: true },
        )}
      </Section>

      {/* Sticky action bar */}
      <div className="fixed right-0 bottom-0 left-0 z-20 border-t border-line bg-white/95 backdrop-blur lg:left-[var(--sidebar-w)] lg:group-data-[sidebar=collapsed]/shell:left-[var(--sidebar-w-collapsed)]">
        <div className="mx-auto flex max-w-[1600px] items-center justify-end gap-2 px-4 py-3 sm:px-6 lg:px-8">
          <span className="mr-auto hidden text-[12.5px] text-ink-muted sm:block" aria-live="polite">
            {dirty ? "Unsaved changes" : "No changes yet"}
          </span>
          <OutlineButton onClick={cancel}>Cancel</OutlineButton>
          <PrimaryButton type="submit" disabled={saving || (editing && !dirty)}>
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
      {newEntry && (
        <CatalogEntryDialog
          kind={newEntry}
          entry={null}
          onClose={() => setNewEntry(null)}
          onSaved={(name) => set(newEntry === "categories" ? "category" : "brand", name)}
        />
      )}
    </form>
  );
}
