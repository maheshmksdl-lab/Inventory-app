"use client";

import { PlusIcon, TrashIcon } from "@phosphor-icons/react/dist/ssr";
import { fieldClass, IconButton, OutlineButton, SelectField, td, th } from "@/components/shared/inventory-ui";
import { lineAmounts, taxRateOf } from "@/lib/doc-math";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { ProductRow } from "@/lib/types/inventory";
import { cn } from "@/lib/utils";

/** A line while editing: numbers stay strings until saved. */
export interface LineDraft {
  key: string;
  productId: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
  discount: string;
}

export interface LineOptions {
  /** Show unit price (cost for purchases, selling price for sales). */
  price?: "cost" | "sell";
  discount?: boolean;
  /** Default unit price when a product is chosen (e.g. the vendor's last cost). */
  priceFor?: (p: ProductRow) => number;
  /** Available quantity per product at the source warehouse; quantities may not exceed it… */
  availability?: (productId: string) => number | undefined;
  /** …unless this is set: then it's shown as information only (sales can be back-ordered). */
  availabilityInfoOnly?: boolean;
}

let lineSeq = 0;
export const newLine = (patch: Partial<LineDraft> = {}): LineDraft => ({ key: `ln-${++lineSeq}`, productId: "", quantity: "1", unitPrice: "", taxRate: "", discount: "0", ...patch });

export const toNumberLine = (l: LineDraft) => ({ productId: l.productId, quantity: Number(l.quantity) || 0, unitPrice: Number(l.unitPrice) || 0, taxRate: Number(l.taxRate) || 0, discount: Number(l.discount) || 0 });

/** Errors keyed `${line.key}.${field}`, plus "lines" for the list as a whole. */
export function validateLines(lines: LineDraft[], opts: LineOptions): Record<string, string> {
  const errs: Record<string, string> = {};
  if (lines.length === 0 || lines.every((l) => !l.productId)) errs.lines = "Add at least one product";
  for (const l of lines) {
    if (!l.productId) {
      errs[`${l.key}.productId`] = "Choose a product";
      continue;
    }
    if (!/^\d+$/.test(l.quantity.trim()) || Number(l.quantity) <= 0) errs[`${l.key}.quantity`] = "Enter a whole number above 0";
    else {
      const avail = opts.availability?.(l.productId);
      if (avail !== undefined && !opts.availabilityInfoOnly && Number(l.quantity) > avail) errs[`${l.key}.quantity`] = `Only ${formatNumber(Math.max(0, avail))} available`;
    }
    if (opts.price && !/^\d+(\.\d{1,2})?$/.test(l.unitPrice.trim())) errs[`${l.key}.unitPrice`] = "Enter a price";
    if (opts.discount && (!/^\d+(\.\d{1,2})?$/.test(l.discount.trim()) || Number(l.discount) > 100)) errs[`${l.key}.discount`] = "0–100";
  }
  return errs;
}

export function LineItemsEditor({
  lines,
  onChange,
  products,
  opts,
  errors,
  idPrefix,
}: {
  lines: LineDraft[];
  onChange: (lines: LineDraft[]) => void;
  products: ProductRow[];
  opts: LineOptions;
  errors: Record<string, string>;
  idPrefix: string;
}) {
  const byId = new Map(products.map((p) => [p.id, p]));
  const patch = (key: string, p: Partial<LineDraft>) => onChange(lines.map((l) => (l.key === key ? { ...l, ...p } : l)));
  const choose = (key: string, productId: string) => {
    const p = byId.get(productId);
    if (!p) return;
    const price = opts.priceFor?.(p) ?? (opts.price === "cost" ? p.costPrice : p.sellingPrice);
    patch(key, { productId, unitPrice: opts.price ? String(price) : "", taxRate: String(taxRateOf(p.taxClass)) });
  };
  const cellErr = (key: string, field: string) => errors[`${key}.${field}`];
  const input = (l: LineDraft, field: "quantity" | "unitPrice" | "discount", label: string) => {
    const err = cellErr(l.key, field);
    const id = `${idPrefix}-${l.key}-${field}`;
    return (
      <>
        <input
          id={id}
          value={l[field]}
          onChange={(e) => patch(l.key, { [field]: e.target.value })}
          inputMode={field === "quantity" ? "numeric" : "decimal"}
          aria-label={label}
          aria-invalid={err ? true : undefined}
          aria-describedby={err ? `${id}-error` : undefined}
          className={cn(fieldClass, "text-right tabular-nums")}
        />
        {err && (
          <p id={`${id}-error`} className="mt-1 text-right text-[11.5px] leading-4 font-medium text-[#DC2626]">
            {err}
          </p>
        )}
      </>
    );
  };

  return (
    <div>
      <div className="relative overflow-x-auto scrollbar-thin">
        <table className="w-full border-collapse" style={{ minWidth: (opts.price ? 820 : 560) + (opts.availability ? 90 : 0) + (opts.discount ? 90 : 0) }}>
          <caption className="sr-only">Line items</caption>
          <thead>
            <tr className="border-y border-line-soft bg-[#FAFAFB]">
              <th scope="col" className={cn(th, "min-w-[240px]")}>
                Product
              </th>
              {opts.availability && (
                <th scope="col" className={cn(th, "w-24 text-right")}>
                  Available
                </th>
              )}
              <th scope="col" className={cn(th, "w-28 text-right")}>
                Quantity
              </th>
              {opts.price && (
                <th scope="col" className={cn(th, "w-32 text-right")}>
                  {opts.price === "cost" ? "Unit cost (₹)" : "Unit price (₹)"}
                </th>
              )}
              {opts.discount && (
                <th scope="col" className={cn(th, "w-24 text-right")}>
                  Disc. %
                </th>
              )}
              {opts.price && (
                <th scope="col" className={cn(th, "w-20 text-right")}>
                  Tax
                </th>
              )}
              {opts.price && (
                <th scope="col" className={cn(th, "w-32 text-right")}>
                  Amount
                </th>
              )}
              <th scope="col" className={cn(th, "w-12")}>
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => {
              const p = byId.get(l.productId);
              const taken = new Set(lines.filter((x) => x.key !== l.key).map((x) => x.productId));
              const options = products.filter((x) => x.lifecycle === "active" && !taken.has(x.id)).map((x) => ({ value: x.id, label: `${x.name} · ${x.sku}` }));
              const amounts = lineAmounts(toNumberLine(l));
              const avail = l.productId ? opts.availability?.(l.productId) : undefined;
              const prodErr = cellErr(l.key, "productId");
              return (
                <tr key={l.key} className="border-b border-line-soft align-top">
                  <td className={cn(td, "align-top")}>
                    <SelectField id={`${idPrefix}-${l.key}-productId`} value={l.productId} onChange={(v) => choose(l.key, v)} options={options.concat(p && !options.some((o) => o.value === p.id) ? [{ value: p.id, label: `${p.name} · ${p.sku}` }] : [])} placeholder={`Choose product ${i + 1}…`} invalid={!!prodErr} />
                    {prodErr && (
                      <p id={`${idPrefix}-${l.key}-productId-error`} className="mt-1 text-[11.5px] leading-4 font-medium text-[#DC2626]">
                        {prodErr}
                      </p>
                    )}
                    {p && <p className="mt-1 text-[12px] leading-4 text-ink-muted">{p.unit} · {p.taxClass}</p>}
                  </td>
                  {opts.availability && (
                    <td className={cn(td, "pt-5 text-right align-top text-ink-muted tabular-nums")}>
                      {avail === undefined ? "—" : formatNumber(avail)}
                      {opts.availabilityInfoOnly && avail !== undefined && Number(l.quantity) > avail && <span className="mt-1 block text-[11.5px] leading-4 font-medium text-[var(--warning)]">Back-order {formatNumber(Number(l.quantity) - Math.max(0, avail))}</span>}
                    </td>
                  )}
                  <td className={cn(td, "align-top")}>{input(l, "quantity", `Quantity for line ${i + 1}`)}</td>
                  {opts.price && <td className={cn(td, "align-top")}>{input(l, "unitPrice", `Unit price for line ${i + 1}`)}</td>}
                  {opts.discount && <td className={cn(td, "align-top")}>{input(l, "discount", `Discount for line ${i + 1}`)}</td>}
                  {opts.price && <td className={cn(td, "pt-5 text-right align-top text-ink-muted tabular-nums")}>{l.taxRate ? `${l.taxRate}%` : "—"}</td>}
                  {opts.price && <td className={cn(td, "pt-5 text-right align-top font-medium text-ink tabular-nums")}>{formatCurrency(amounts.total, { decimals: true })}</td>}
                  <td className={cn(td, "pt-3.5 align-top")}>
                    <IconButton aria-label={`Remove line ${i + 1}`} disabled={lines.length === 1} onClick={() => onChange(lines.filter((x) => x.key !== l.key))}>
                      <TrashIcon size={16} aria-hidden />
                    </IconButton>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
        <OutlineButton icon={PlusIcon} onClick={() => onChange([...lines, newLine()])}>
          Add line
        </OutlineButton>
        {errors.lines && <p className="text-[12px] font-medium text-[#DC2626]">{errors.lines}</p>}
      </div>
    </div>
  );
}
