import Link from "next/link";
import { ProductThumb } from "@/components/shared/product-thumb";
import { td, th, ToneBadge } from "@/components/shared/inventory-ui";
import { formatDate, formatShortDate, formatSigned, formatTime } from "@/lib/format";
import { MOVEMENT_META } from "@/lib/inventory-meta";
import { warehouseById } from "@/lib/mock-data/warehouses";
import { itemHref } from "@/lib/routes";
import type { ProductIconKey, StockMovement } from "@/lib/types/inventory";
import { cn } from "@/lib/utils";

export interface MovementProduct {
  name: string;
  icon: ProductIconKey;
  image?: string;
}

const whShort = (id: string | null) => warehouseById(id)?.short ?? "—";

/** "Main → Branch", "→ Main" (into), "Main →" (out of). */
export function fromTo(m: StockMovement) {
  if (m.from && m.to) return `${whShort(m.from)} → ${whShort(m.to)}`;
  if (m.to) return `→ ${whShort(m.to)}`;
  return `${whShort(m.from)} →`;
}

/** Transfers move stock between warehouses, so they carry no sign. */
function Quantity({ m }: { m: StockMovement }) {
  if (m.type === "transfer") return <span className="text-ink-body">{m.quantity}</span>;
  return <span className={cn("font-medium", m.quantity < 0 ? "text-[var(--danger)]" : "text-[var(--success)]")}>{formatSigned(m.quantity)}</span>;
}

/** Full ledger table — one column per field (an item's Transactions tab). */
export function MovementTable({ rows, caption }: { rows: StockMovement[]; caption: string }) {
  return (
    <div className="relative overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[640px] border-collapse">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-y border-line-soft bg-[#FAFAFB]">
            <th scope="col" className={th}>
              Date &amp; time
            </th>
            <th scope="col" className={th}>
              Type
            </th>
            <th scope="col" className={cn(th, "text-right")}>
              Quantity
            </th>
            <th scope="col" className={th}>
              Warehouse (from → to)
            </th>
            <th scope="col" className={th}>
              Reference
            </th>
            <th scope="col" className={th}>
              User
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.id} className="border-b border-line-soft last:border-0">
              <td className={cn(td, "whitespace-nowrap")}>
                <span className="block text-ink">{formatDate(m.at)}</span>
                <span className="block text-[12px] leading-4 text-ink-muted">{formatTime(m.at)}</span>
              </td>
              <td className={td}>
                <ToneBadge tone={MOVEMENT_META[m.type]} />
              </td>
              <td className={cn(td, "text-right tabular-nums")}>
                <Quantity m={m} />
              </td>
              <td className={cn(td, "whitespace-nowrap")}>{fromTo(m)}</td>
              <td className={cn(td, "font-mono text-[12px] whitespace-nowrap text-ink")}>{m.reference}</td>
              <td className={cn(td, "whitespace-nowrap")}>{m.user}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Compact ledger for dashboard cards: every field is present, paired into
 * two-line cells (product + time, type + route, reference + user) so the
 * table fits a narrow column without hiding anything.
 */
export function CompactMovementTable({ rows, products, caption }: { rows: StockMovement[]; products: Map<string, MovementProduct>; caption: string }) {
  const sub = "block truncate text-[12px] leading-4 text-ink-muted";
  return (
    <div className="relative overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[440px] table-fixed border-collapse">
        <caption className="sr-only">{caption}</caption>
        <colgroup>
          <col />
          <col className="w-[132px]" />
          <col className="w-[64px]" />
          <col className="w-[104px]" />
        </colgroup>
        <thead>
          <tr className="border-y border-line-soft bg-[#FAFAFB]">
            <th scope="col" className={th}>
              Product · Date &amp; time
            </th>
            <th scope="col" className={th}>
              Type · From / To
            </th>
            <th scope="col" className={cn(th, "text-right")}>
              Qty
            </th>
            <th scope="col" className={th}>
              Ref · User
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => {
            const p = products.get(m.productId);
            return (
              <tr key={m.id} className="border-b border-line-soft last:border-0">
                <td className={cn(td, "py-2.5")}>
                  <span className="flex min-w-0 items-center gap-2.5">
                    {p && <ProductThumb icon={p.icon} src={p.image} size={30} />}
                    <span className="min-w-0">
                      {p ? (
                        <Link href={itemHref(m.productId)} className="block truncate rounded font-medium text-ink hover:text-brand focus-visible:outline-2 focus-visible:outline-brand-action">
                          {p.name}
                        </Link>
                      ) : (
                        <span className="block truncate">Unknown item</span>
                      )}
                      <span className={sub}>
                        {formatShortDate(m.at)}, {formatTime(m.at)}
                      </span>
                    </span>
                  </span>
                </td>
                <td className={cn(td, "py-2.5")}>
                  <ToneBadge tone={MOVEMENT_META[m.type]} className="max-w-full truncate px-1.5 text-[11.5px]" />
                  <span className={cn(sub, "mt-0.5")}>{fromTo(m)}</span>
                </td>
                <td className={cn(td, "py-2.5 text-right tabular-nums")}>
                  <Quantity m={m} />
                </td>
                <td className={cn(td, "py-2.5")}>
                  <span className="block truncate font-mono text-[12px] leading-5 text-ink">{m.reference}</span>
                  <span className={sub}>{m.user}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
