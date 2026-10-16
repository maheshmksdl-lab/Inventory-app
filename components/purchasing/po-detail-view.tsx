"use client";

import { useState } from "react";
import { ArrowUUpLeftIcon, CheckIcon, PaperPlaneTiltIcon, PencilSimpleIcon, TrayArrowDownIcon, XCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { useConfirmAction, useDocUpdate } from "@/components/shared/doc-actions";
import { ActivityList, Detail, DetailSkeleton, MissingRecord, OutlineLink, PrimaryLink, PrototypeNote, StatusSteps, TextLink, TotalsPanel } from "@/components/shared/doc-ui";
import { Card, CardHeader, OutlineButton, PageHeading, PageShell, PrimaryButton, td, th, ToneBadge, UnderlineTabs } from "@/components/shared/inventory-ui";
import { ProductThumb } from "@/components/shared/product-thumb";
import { useProducts, useRecord, useRecords } from "@/hooks/use-operations";
import { warehouseLabel } from "@/lib/derive";
import { docTotals, lineAmounts } from "@/lib/doc-math";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { BILL_STATUS, PO_STATUS, RECEIPT_STATUS } from "@/lib/operations-meta";
import { itemHref, newHref, recordHref, ROUTES } from "@/lib/routes";
import type { PurchaseOrderStatus } from "@/lib/types/inventory";
import type { PurchaseOrder } from "@/lib/types/operations";
import { cn } from "@/lib/utils";
import { poReceivedPct, vendorLabel } from "./po-columns";

type Tab = "overview" | "items" | "activity";
const FLOW: PurchaseOrderStatus[] = ["draft", "pending-approval", "confirmed", "partially-received", "completed"];

export function PoDetailView({ id }: { id: string }) {
  const { data: po, isError } = useRecord("purchaseOrders", id);
  const { data: vendors } = useRecords("vendors");
  const { data: warehouses } = useRecords("warehouses");
  const { data: receipts } = useRecords("goodsReceipts");
  const { data: bills } = useRecords("supplierBills");
  const { data: products } = useProducts();
  const update = useDocUpdate("purchaseOrders");
  const confirm = useConfirmAction();
  const [tab, setTab] = useState<Tab>("overview");
  const crumbs = [{ label: "Purchasing" }, { label: "Purchase Orders", href: ROUTES.purchaseOrders }, { label: po?.number ?? "Purchase order" }];

  if (isError) return <MissingRecord crumbs={crumbs} noun="purchase order" backHref={ROUTES.purchaseOrders} backLabel="Back to Purchase Orders" />;
  if (!po || !products) return <DetailSkeleton crumbs={crumbs} />;

  const byId = new Map(products.map((p) => [p.id, p]));
  const totals = docTotals(po.lines);
  const related = (receipts ?? []).filter((g) => g.poId === po.id);
  const relatedBills = (bills ?? []).filter((b) => b.poId === po.id);
  const set = (status: PurchaseOrderStatus, log: string, title: string, description?: string) => update.run(po, { status } as Partial<PurchaseOrder>, log, title, description);
  const canCancel = ["draft", "pending-approval", "confirmed"].includes(po.status);
  const receivable = po.status === "confirmed" || po.status === "partially-received";

  return (
    <PageShell>
      <PageHeading
        crumbs={crumbs}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-mono">{po.number}</span>
            <ToneBadge tone={PO_STATUS[po.status]} />
          </span>
        }
        description={
          <>
            <TextLink href={recordHref("vendors", po.vendorId)} className="font-normal">
              {vendorLabel(vendors, po.vendorId)}
            </TextLink>{" "}
            · deliver to {warehouseLabel(warehouses, po.warehouseId)} · {formatCurrency(totals.total, { decimals: true })}
          </>
        }
        actions={
          <>
            {canCancel && (
              <OutlineButton
                icon={XCircleIcon}
                onClick={() =>
                  confirm.ask({
                    title: "Cancel this purchase order?",
                    body: <p>{po.number} will be marked Cancelled. Nothing is sent to the vendor in this prototype.</p>,
                    confirmLabel: "Cancel order",
                    destructive: true,
                    run: () => set("cancelled", "Purchase order cancelled", `${po.number} cancelled`),
                  })
                }
              >
                Cancel order
              </OutlineButton>
            )}
            {po.status === "draft" && (
              <>
                <OutlineLink href={`${recordHref("purchaseOrders", po.id)}/edit`} icon={PencilSimpleIcon}>
                  Edit
                </OutlineLink>
                <PrimaryButton icon={PaperPlaneTiltIcon} onClick={() => void set("pending-approval", "Submitted for approval", "Submitted for approval")}>
                  Submit for approval
                </PrimaryButton>
              </>
            )}
            {po.status === "pending-approval" && (
              <>
                <OutlineButton icon={ArrowUUpLeftIcon} onClick={() => void set("draft", "Returned to draft for changes", "Returned to draft")}>
                  Return to draft
                </OutlineButton>
                <PrimaryButton
                  icon={CheckIcon}
                  onClick={() =>
                    confirm.ask({
                      title: "Approve and confirm this order?",
                      body: <p>{po.number} becomes Confirmed. In this prototype no order is transmitted to {vendorLabel(vendors, po.vendorId)} and stock does not change.</p>,
                      confirmLabel: "Approve",
                      run: () => set("confirmed", "Approved and marked confirmed (simulated)", `${po.number} confirmed`, "Demo status only — no order sent, no stock added."),
                    })
                  }
                >
                  Approve
                </PrimaryButton>
              </>
            )}
            {receivable && (
              <PrimaryLink href={newHref("goodsReceipts", { po: po.id })} icon={TrayArrowDownIcon}>
                Record goods receipt
              </PrimaryLink>
            )}
          </>
        }
      />
      <Card className="mt-5 px-5 py-4">
        <StatusSteps steps={FLOW} current={po.status === "cancelled" ? "draft" : po.status} labels={Object.fromEntries(FLOW.map((s) => [s, PO_STATUS[s].label])) as Record<PurchaseOrderStatus, string>} cancelled={po.status === "cancelled"} />
      </Card>

      <Card className="mt-4">
        <UnderlineTabs
          idPrefix="po"
          label="Purchase order sections"
          value={tab}
          onChange={setTab}
          className="px-5 pt-3"
          tabs={[
            { value: "overview", label: "Overview" },
            { value: "items", label: "Items", count: po.lines.length },
            { value: "activity", label: "Activity", count: po.activity.length },
          ]}
        />
        {tab === "overview" && (
          <div id="po-panel-overview" role="tabpanel" aria-labelledby="po-tab-overview" className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <Detail label="Vendor">
                <TextLink href={recordHref("vendors", po.vendorId)}>{vendorLabel(vendors, po.vendorId)}</TextLink>
              </Detail>
              <Detail label="Deliver to">{warehouseLabel(warehouses, po.warehouseId)}</Detail>
              <Detail label="Order date">{formatDate(po.orderDate)}</Detail>
              <Detail label="Expected delivery">{formatDate(po.expectedDate)}</Detail>
              <Detail label="Created by">{po.createdBy}</Detail>
              <Detail label="Received">{poReceivedPct(po)}% of ordered units</Detail>
              <Detail label="Notes" className="sm:col-span-2">
                {po.notes || <span className="text-ink-muted">No notes</span>}
              </Detail>
            </dl>
            <div className="rounded-xl bg-[#F9FAFB] p-4">
              <TotalsPanel totals={totals} className="max-w-none" />
              <p className="mt-3 text-[12px] leading-4 text-ink-muted">Tax is calculated per line from each item&apos;s tax class. Illustrative figures.</p>
            </div>
          </div>
        )}
        {tab === "items" && (
          <div id="po-panel-items" role="tabpanel" aria-labelledby="po-tab-items" className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[900px] border-collapse">
              <caption className="sr-only">Items on {po.number}</caption>
              <thead>
                <tr className="border-y border-line-soft bg-[#FAFAFB]">
                  {["Product", "Ordered", "Received", "Outstanding", "Unit cost", "Tax", "Line total"].map((h, i) => (
                    <th key={h} scope="col" className={cn(th, i > 0 && "text-right")}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {po.lines.map((l) => {
                  const p = byId.get(l.productId);
                  return (
                    <tr key={l.productId} className="border-b border-line-soft">
                      <td className={td}>
                        <span className="flex items-center gap-3">
                          {p && <ProductThumb icon={p.icon} src={p.image} size={30} />}
                          <span className="min-w-0">
                            <TextLink href={itemHref(l.productId)} className="block truncate">
                              {p?.name ?? l.productId}
                            </TextLink>
                            <span className="block font-mono text-[12px] leading-4 text-ink-muted">{p?.sku}</span>
                          </span>
                        </span>
                      </td>
                      <td className={cn(td, "text-right tabular-nums")}>{formatNumber(l.quantity)}</td>
                      <td className={cn(td, "text-right tabular-nums")}>{formatNumber(l.received)}</td>
                      <td className={cn(td, "text-right font-medium text-ink tabular-nums")}>{formatNumber(Math.max(0, l.quantity - l.received))}</td>
                      <td className={cn(td, "text-right tabular-nums")}>{formatCurrency(l.unitPrice, { decimals: true })}</td>
                      <td className={cn(td, "text-right tabular-nums")}>{l.taxRate}%</td>
                      <td className={cn(td, "text-right font-semibold text-ink tabular-nums")}>{formatCurrency(lineAmounts(l).total, { decimals: true })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="border-t border-line-soft px-5 py-4">
              <TotalsPanel totals={totals} />
            </div>
          </div>
        )}
        {tab === "activity" && (
          <div id="po-panel-activity" role="tabpanel" aria-labelledby="po-tab-activity" className="grid gap-4 p-5 lg:grid-cols-2">
            <ActivityList items={po.activity} />
            <div className="space-y-4">
              <Card>
                <CardHeader title="Goods receipts" subtitle={related.length ? undefined : "None yet"} />
                <ul className="px-5 pb-4">
                  {related.map((g) => (
                    <li key={g.id} className="flex items-center justify-between gap-3 border-t border-line-soft py-2 text-[13px]">
                      <TextLink href={recordHref("goodsReceipts", g.id)} className="font-mono">
                        {g.number}
                      </TextLink>
                      <span className="text-ink-muted">{formatDate(g.receivedDate)}</span>
                      <ToneBadge tone={RECEIPT_STATUS[g.status]} />
                    </li>
                  ))}
                </ul>
              </Card>
              <Card>
                <CardHeader title="Supplier bills" subtitle={relatedBills.length ? undefined : "None yet"} />
                <ul className="px-5 pb-4">
                  {relatedBills.map((b) => (
                    <li key={b.id} className="flex items-center justify-between gap-3 border-t border-line-soft py-2 text-[13px]">
                      <TextLink href={recordHref("supplierBills", b.id)} className="font-mono">
                        {b.number}
                      </TextLink>
                      <span className="tabular-nums">{formatCurrency(b.amount)}</span>
                      <ToneBadge tone={BILL_STATUS[b.status]} />
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        )}
      </Card>
      <PrototypeNote className="mt-4">Status changes are simulated and saved in this browser tab only. Approving or confirming an order doesn&apos;t contact the vendor or add stock; receipts are recorded separately as demo records.</PrototypeNote>
      {confirm.dialog}
    </PageShell>
  );
}
