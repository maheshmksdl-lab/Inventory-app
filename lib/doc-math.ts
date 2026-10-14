/**
 * Order arithmetic shared by forms, detail pages, reports and seed data, so a
 * total is computed the same way everywhere. Illustrative only — not tax advice.
 */
import type { OrderLine } from "@/lib/types/operations";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** "GST 18%" → 18, "Exempt" → 0. */
export const taxRateOf = (taxClass: string) => Number(/(\d+(?:\.\d+)?)%/.exec(taxClass)?.[1] ?? 0);

export interface LineAmounts {
  gross: number;
  discount: number;
  net: number;
  tax: number;
  total: number;
}

export function lineAmounts(l: Pick<OrderLine, "quantity" | "unitPrice" | "taxRate" | "discount">): LineAmounts {
  const gross = l.quantity * l.unitPrice;
  const discount = gross * (l.discount / 100);
  const net = gross - discount;
  const tax = net * (l.taxRate / 100);
  return { gross: round2(gross), discount: round2(discount), net: round2(net), tax: round2(tax), total: round2(net + tax) };
}

export interface DocTotals {
  quantity: number;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

export function docTotals(lines: Pick<OrderLine, "quantity" | "unitPrice" | "taxRate" | "discount">[]): DocTotals {
  let quantity = 0;
  let subtotal = 0;
  let discount = 0;
  let tax = 0;
  for (const l of lines) {
    const a = lineAmounts(l);
    quantity += l.quantity;
    subtotal += a.gross;
    discount += a.discount;
    tax += a.tax;
  }
  return { quantity, subtotal: round2(subtotal), discount: round2(discount), tax: round2(tax), total: round2(subtotal - discount + tax) };
}
