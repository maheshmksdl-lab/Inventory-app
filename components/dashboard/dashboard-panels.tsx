"use client";

import Link from "next/link";
import { CheckCircleIcon, ShoppingBagIcon } from "@phosphor-icons/react/dist/ssr";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, StatusBadge, td, th, ViewAll } from "@/components/shared/inventory-ui";
import { CompactMovementTable, type MovementProduct } from "@/components/shared/movement-table";
import { ProductThumb } from "@/components/shared/product-thumb";
import { EmptyState } from "@/components/shared/state-panels";
import { formatCurrency, formatNumber } from "@/lib/format";
import { PO_STATUSES, SO_STATUSES } from "@/lib/inventory-meta";
import { warehouseById, warehouseName } from "@/lib/mock-data/warehouses";
import { itemHref } from "@/lib/routes";
import type { DashboardData } from "@/lib/types/inventory";
import { cn } from "@/lib/utils";

function RowsSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3 px-5 pb-5", className)} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-7 rounded-lg" />
          <Skeleton className="h-3.5 flex-1" />
          <Skeleton className="h-3.5 w-14" />
        </div>
      ))}
    </div>
  );
}

// ── Low stock alerts ─────────────────────────────────────────────────

export function LowStockAlerts({ data, className }: { data: DashboardData | undefined; className?: string }) {
  return (
    <Card label="Low stock alerts" className={className}>
      <CardHeader
        title="Low Stock Alerts"
        subtitle={data ? `${formatNumber(data.lowStockTotal)} warehouse location${data.lowStockTotal === 1 ? "" : "s"} at or below reorder point` : " "}
        action={<ViewAll href="/items?stock=low-stock" />}
      />
      {!data ? (
        <RowsSkeleton />
      ) : data.lowStock.length === 0 ? (
        <EmptyState icon={CheckCircleIcon} title="No low-stock alerts" hint="Every item is above its reorder point in this warehouse selection." />
      ) : (
        <div className="relative overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[440px] table-fixed border-collapse">
            <caption className="sr-only">Items at or below their reorder point, by warehouse</caption>
            <colgroup>
              <col />
              <col className="w-[84px]" />
              <col className="w-[112px]" />
              <col className="w-[92px]" />
            </colgroup>
            <thead>
              <tr className="border-y border-line-soft bg-[#FAFAFB]">
                <th scope="col" className={th}>
                  Product · Warehouse
                </th>
                <th scope="col" className={cn(th, "text-right")}>
                  <abbr title="Available / Reorder point" className="no-underline">
                    Avail. / ROP
                  </abbr>
                </th>
                <th scope="col" className={th}>
                  Status
                </th>
                <th scope="col" className={cn(th, "text-right")}>
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.lowStock.map((a) => (
                <tr key={`${a.productId}-${a.warehouseId}`} className="border-b border-line-soft last:border-0">
                  <td className={cn(td, "py-2.5")}>
                    <Link href={itemHref(a.productId)} className="flex min-w-0 items-center gap-2.5 rounded focus-visible:outline-2 focus-visible:outline-brand-action">
                      <ProductThumb icon={a.icon} src={a.image} size={30} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-ink hover:text-brand">{a.name}</span>
                        <span className="block truncate text-[12px] leading-4 text-ink-muted">
                          <span className="font-mono">{a.sku}</span> · {warehouseName(a.warehouseId)}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className={cn(td, "py-2.5 text-right whitespace-nowrap tabular-nums")}>
                    <span className="font-semibold text-ink">{formatNumber(a.available)}</span>
                    <span className="text-ink-muted"> / {formatNumber(a.reorderPoint)}</span>
                  </td>
                  <td className={cn(td, "py-2.5")}>
                    <StatusBadge status={a.status} className="px-1.5 text-[11.5px]" />
                  </td>
                  <td className={cn(td, "py-2.5 text-right")}>
                    <Link
                      href={`/reorder-alerts?q=${encodeURIComponent(a.sku)}`}
                      className="inline-flex h-7 items-center rounded-lg border border-line bg-white px-2.5 text-[12px] font-medium text-ink-body transition-colors hover:border-[#D0D5DD] hover:bg-[#F9FAFB] hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-action"
                      aria-label={`Reorder ${a.name}`}
                    >
                      Reorder
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ── Order overview ───────────────────────────────────────────────────

function StatusList({ title, rows }: { title: string; rows: { value: string; label: string; dot: string; count: number }[] }) {
  const total = rows.reduce((s, r) => s + r.count, 0);
  return (
    <div>
      <h3 className="flex items-baseline justify-between text-[12.5px] leading-5 font-semibold text-ink">
        {title}
        <span className="text-[12px] font-normal text-ink-muted tabular-nums">{formatNumber(total)} total</span>
      </h3>
      <ul className="mt-1.5 space-y-0.5">
        {rows.map((r) => (
          <li key={r.value} className="flex items-center gap-2.5 rounded-md py-1 text-[13px] leading-5 text-ink-body">
            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: r.dot }} aria-hidden />
            <span className="flex-1 truncate">{r.label}</span>
            <span className="font-semibold text-ink tabular-nums">{formatNumber(r.count)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function OrderOverview({ data, className }: { data: DashboardData | undefined; className?: string }) {
  return (
    <Card label="Order overview" className={className}>
      <CardHeader title="Order Overview" subtitle="Current order pipeline" />
      {!data ? (
        <RowsSkeleton rows={8} />
      ) : (
        <div className="space-y-4 px-5 pb-4">
          <StatusList title="Purchase Orders" rows={PO_STATUSES.map((s) => ({ ...s, count: data.purchaseOrders[s.value] }))} />
          <div className="border-t border-line-soft" />
          <StatusList title="Sales Orders" rows={SO_STATUSES.map((s) => ({ ...s, count: data.salesOrders[s.value] }))} />
          <p className="flex flex-wrap gap-x-3 text-[11.5px] leading-4 text-ink-muted">
            Demo counts from the order lists.
            <Link href="/purchase-orders" className="font-medium text-brand hover:text-brand-press">
              Purchase Orders
            </Link>
            <Link href="/sales-orders" className="font-medium text-brand hover:text-brand-press">
              Sales Orders
            </Link>
          </p>
        </div>
      )}
    </Card>
  );
}

// ── Recent stock movements ───────────────────────────────────────────

export function RecentMovements({ data, products, className }: { data: DashboardData | undefined; products: Map<string, MovementProduct>; className?: string }) {
  return (
    <Card label="Recent stock movements" className={className}>
      <CardHeader title="Recent Stock Movements" subtitle="Latest entries in the stock ledger" action={<ViewAll href="/stock-movements" />} />
      {!data ? (
        <RowsSkeleton rows={6} />
      ) : data.recentMovements.length === 0 ? (
        <EmptyState icon={CheckCircleIcon} title="No stock movements in this period" hint="Try a longer date range or another warehouse." />
      ) : (
        <div className="pb-1">
          <CompactMovementTable rows={data.recentMovements} products={products} caption="Recent stock movements" />
        </div>
      )}
    </Card>
  );
}

// ── Warehouse overview ───────────────────────────────────────────────

export function WarehouseOverview({ data, className }: { data: DashboardData | undefined; className?: string }) {
  const rows = data?.warehouses ?? [];
  const total = rows.reduce((t, r) => ({ skus: t.skus, quantity: t.quantity + r.quantity, value: t.value + r.value, lowStock: t.lowStock + r.lowStock }), { skus: 0, quantity: 0, value: 0, lowStock: 0 });
  return (
    <Card label="Warehouse overview" className={className}>
      <CardHeader title="Warehouse Overview" subtitle="All warehouses · stock at cost" action={<ViewAll href="/warehouses" />} />
      {!data ? (
        <RowsSkeleton rows={4} />
      ) : (
        <div className="relative overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[372px] table-fixed border-collapse">
            <caption className="sr-only">Stock by warehouse</caption>
            <colgroup>
              <col />
              <col className="w-[56px]" />
              <col className="w-[68px]" />
              <col className="w-[112px]" />
              <col className="w-[64px]" />
            </colgroup>
            <thead>
              <tr className="border-y border-line-soft bg-[#FAFAFB]">
                <th scope="col" className={th}>
                  Warehouse
                </th>
                <th scope="col" className={cn(th, "text-right")}>
                  <abbr title="SKUs in stock" className="no-underline">
                    SKUs
                  </abbr>
                </th>
                <th scope="col" className={cn(th, "text-right")}>
                  Stock qty
                </th>
                <th scope="col" className={cn(th, "text-right")}>
                  Value
                </th>
                <th scope="col" className={cn(th, "text-right")}>
                  Low
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.warehouseId} className="border-b border-line-soft">
                  <th scope="row" className={cn(td, "truncate text-left font-medium text-ink")} title={warehouseName(r.warehouseId)}>
                    {warehouseById(r.warehouseId)?.short}
                    <span className="sr-only"> Warehouse</span>
                  </th>
                  <td className={cn(td, "text-right tabular-nums")}>{formatNumber(r.skus)}</td>
                  <td className={cn(td, "text-right tabular-nums")}>{formatNumber(r.quantity)}</td>
                  <td className={cn(td, "text-right whitespace-nowrap tabular-nums")}>{formatCurrency(r.value)}</td>
                  <td className={cn(td, "text-right font-medium tabular-nums", r.lowStock > 0 ? "text-[var(--warning)]" : "text-ink-body")}>{formatNumber(r.lowStock)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#FAFAFB]">
                <th scope="row" className={cn(td, "text-left font-semibold text-ink")}>
                  Total
                </th>
                <td className={cn(td, "text-right text-ink-muted")}>—</td>
                <td className={cn(td, "text-right font-semibold text-ink tabular-nums")}>{formatNumber(total.quantity)}</td>
                <td className={cn(td, "text-right font-semibold whitespace-nowrap text-ink tabular-nums")}>{formatCurrency(total.value)}</td>
                <td className={cn(td, "text-right font-semibold text-ink tabular-nums")}>{formatNumber(total.lowStock)}</td>
              </tr>
            </tfoot>
          </table>
          <p className="px-5 pt-2 pb-4 text-[11.5px] leading-4 text-ink-muted">SKU counts aren&apos;t totalled: one item can be stocked in several warehouses.</p>
        </div>
      )}
    </Card>
  );
}

// ── Top selling products ─────────────────────────────────────────────

export function TopSelling({ data, className }: { data: DashboardData | undefined; className?: string }) {
  return (
    <Card label="Top selling products" className={className}>
      <CardHeader title="Top Selling Products" subtitle="By units issued to sales orders" />
      {!data ? (
        <RowsSkeleton />
      ) : data.topSellers.length === 0 ? (
        <EmptyState icon={ShoppingBagIcon} title="No sales in this period" hint="Try a longer date range or another warehouse." />
      ) : (
        <div className="relative overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[250px] table-fixed border-collapse">
            <caption className="sr-only">Top selling products</caption>
            <colgroup>
              <col />
              <col className="w-[116px]" />
            </colgroup>
            <thead>
              <tr className="border-y border-line-soft bg-[#FAFAFB]">
                <th scope="col" className={th}>
                  Product
                </th>
                <th scope="col" className={cn(th, "text-right")}>
                  Revenue · Sold
                </th>
              </tr>
            </thead>
            <tbody>
              {data.topSellers.map((t) => (
                <tr key={t.productId} className="border-b border-line-soft last:border-0">
                  <td className={cn(td, "py-2.5")}>
                    <Link href={itemHref(t.productId)} className="flex min-w-0 items-center gap-2.5 rounded focus-visible:outline-2 focus-visible:outline-brand-action">
                      <ProductThumb icon={t.icon} src={t.image} size={30} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-ink hover:text-brand">{t.name}</span>
                        <span className="block truncate font-mono text-[11.5px] leading-4 text-ink-muted">{t.sku}</span>
                      </span>
                    </Link>
                  </td>
                  <td className={cn(td, "py-2.5 text-right whitespace-nowrap tabular-nums")}>
                    <span className="block font-medium text-ink">{formatCurrency(t.revenue)}</span>
                    <span className="block text-[12px] leading-4 text-ink-muted">{formatNumber(t.quantity)} sold</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-5 pt-2 pb-4 text-[11.5px] leading-4 text-ink-muted">Revenue estimated at current selling prices.</p>
        </div>
      )}
    </Card>
  );
}
