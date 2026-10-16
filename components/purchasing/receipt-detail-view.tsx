"use client";

import { ClockCounterClockwiseIcon, PaperclipIcon } from "@phosphor-icons/react/dist/ssr";
import { Detail, DetailGrid, DetailSkeleton, MissingRecord, OutlineLink, PrototypeNote, TextLink } from "@/components/shared/doc-ui";
import { Card, CardHeader, PageHeading, PageShell, td, th, ToneBadge } from "@/components/shared/inventory-ui";
import { ProductThumb } from "@/components/shared/product-thumb";
import { useProducts, useRecord, useRecords } from "@/hooks/use-operations";
import { warehouseLabel } from "@/lib/derive";
import { formatDate, formatNumber } from "@/lib/format";
import { RECEIPT_STATUS } from "@/lib/operations-meta";
import { itemHref, recordHref, ROUTES } from "@/lib/routes";
import type { GoodsReceipt } from "@/lib/types/operations";
import { cn } from "@/lib/utils";
import { accepted, rejected } from "./goods-receipts-view";
import { vendorLabel } from "./po-columns";

export function ReceiptDetailView({ id }: { id: string }) {
  const { data: g, isError } = useRecord("goodsReceipts", id);
  const { data: pos } = useRecords("purchaseOrders");
  const { data: vendors } = useRecords("vendors");
  const { data: warehouses } = useRecords("warehouses");
  const { data: products } = useProducts();
  const crumbs = [{ label: "Purchasing" }, { label: "Goods Receipts", href: ROUTES.goodsReceipts }, { label: g?.number ?? "Receipt" }];

  if (isError) return <MissingRecord crumbs={crumbs} noun="goods receipt" backHref={ROUTES.goodsReceipts} backLabel="Back to Goods Receipts" />;
  if (!g || !products) return <DetailSkeleton crumbs={crumbs} />;
  const po = pos?.find((p) => p.id === g.poId);
  const byId = new Map(products.map((p) => [p.id, p]));
  const sum = (f: (l: GoodsReceipt["lines"][number]) => number) => g.lines.reduce((s, l) => s + f(l), 0);

  return (
    <PageShell>
      <PageHeading
        crumbs={crumbs}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-mono">{g.number}</span>
            <ToneBadge tone={RECEIPT_STATUS[g.status]} />
          </span>
        }
        description={`${vendorLabel(vendors, g.vendorId)} · ${warehouseLabel(warehouses, g.warehouseId)} · ${formatDate(g.receivedDate)}`}
        actions={
          g.status !== "draft" ? (
            <OutlineLink href={`${ROUTES.movements}?q=${encodeURIComponent(g.number)}`} icon={ClockCounterClockwiseIcon}>
              View in movement history
            </OutlineLink>
          ) : undefined
        }
      />
      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Items" subtitle={`${formatNumber(accepted(g))} accepted · ${formatNumber(rejected(g))} rejected`} />
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[720px] border-collapse">
              <caption className="sr-only">Items on {g.number}</caption>
              <thead>
                <tr className="border-y border-line-soft bg-[#FAFAFB]">
                  {["Product", "Expected", "Received", "Rejected", "Accepted"].map((h, i) => (
                    <th key={h} scope="col" className={cn(th, i > 0 && "text-right")}>
                      {h}
                    </th>
                  ))}
                  <th scope="col" className={th}>
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody>
                {g.lines.map((l) => {
                  const p = byId.get(l.productId);
                  return (
                    <tr key={l.productId} className="border-b border-line-soft">
                      <td className={td}>
                        <span className="flex items-center gap-3">
                          {p && <ProductThumb icon={p.icon} src={p.image} size={30} />}
                          <span className="min-w-0">
                            <TextLink href={itemHref(l.productId)} className="block truncate">
                              {p?.name}
                            </TextLink>
                            <span className="block font-mono text-[12px] leading-4 text-ink-muted">{p?.sku}</span>
                          </span>
                        </span>
                      </td>
                      <td className={cn(td, "text-right tabular-nums")}>{formatNumber(l.expected)}</td>
                      <td className={cn(td, "text-right tabular-nums")}>{formatNumber(l.received)}</td>
                      <td className={cn(td, "text-right tabular-nums", l.rejected > 0 && "font-medium text-[var(--danger)]")}>{formatNumber(l.rejected)}</td>
                      <td className={cn(td, "text-right font-semibold text-ink tabular-nums")}>{formatNumber(l.received - l.rejected)}</td>
                      <td className={td}>{l.rejectReason || <span className="text-ink-muted">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-[#FAFAFB]">
                  <th scope="row" className={cn(td, "text-left font-semibold text-ink")}>
                    Total
                  </th>
                  <td className={cn(td, "text-right font-semibold text-ink tabular-nums")}>{formatNumber(sum((l) => l.expected))}</td>
                  <td className={cn(td, "text-right font-semibold text-ink tabular-nums")}>{formatNumber(sum((l) => l.received))}</td>
                  <td className={cn(td, "text-right font-semibold text-ink tabular-nums")}>{formatNumber(sum((l) => l.rejected))}</td>
                  <td className={cn(td, "text-right font-semibold text-ink tabular-nums")}>{formatNumber(accepted(g))}</td>
                  <td className={td} />
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Details" />
            <DetailGrid className="lg:grid-cols-2">
              <Detail label="Purchase order">{po ? <TextLink href={recordHref("purchaseOrders", po.id)} className="font-mono">{po.number}</TextLink> : "—"}</Detail>
              <Detail label="Vendor">
                <TextLink href={recordHref("vendors", g.vendorId)}>{vendorLabel(vendors, g.vendorId)}</TextLink>
              </Detail>
              <Detail label="Warehouse">{warehouseLabel(warehouses, g.warehouseId)}</Detail>
              <Detail label="Received date">{formatDate(g.receivedDate)}</Detail>
              <Detail label="Received by">{g.createdBy}</Detail>
              <Detail label="Status">{RECEIPT_STATUS[g.status].label}</Detail>
              <Detail label="Notes" className="sm:col-span-2">
                {g.notes || <span className="text-ink-muted">No notes</span>}
              </Detail>
            </DetailGrid>
          </Card>
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-line bg-white px-4 py-3 text-[12.5px] text-ink-muted">
            <PaperclipIcon size={18} aria-hidden className="shrink-0 text-ink-faint" />
            No attachments. File uploads aren&apos;t available in this prototype.
          </div>
          <PrototypeNote>
            {g.status === "draft"
              ? "Draft receipt — not posted. Posting to stock isn't available in this prototype, so on-hand quantities are unchanged."
              : `Seeded history: accepted units for ${g.number} appear as a receipt in Stock Movement History.`}
          </PrototypeNote>
        </div>
      </div>
    </PageShell>
  );
}
