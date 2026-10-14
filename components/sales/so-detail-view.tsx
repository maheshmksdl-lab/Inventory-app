"use client";

import { useState } from "react";
import { ArrowUUpLeftIcon, CheckIcon, PencilSimpleIcon, TruckIcon, XCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { useConfirmAction, useDocUpdate } from "@/components/shared/doc-actions";
import { ActivityList, Detail, DetailSkeleton, MissingRecord, OutlineLink, PrimaryLink, PrototypeNote, StatusSteps, TextLink, TotalsPanel } from "@/components/shared/doc-ui";
import { Card, OutlineButton, PageHeading, PageShell, PrimaryButton, td, th, ToneBadge, UnderlineTabs } from "@/components/shared/inventory-ui";
import { ProductThumb } from "@/components/shared/product-thumb";
import { useProducts, useRecord, useRecords, useSaveRecord } from "@/hooks/use-operations";
import { warehouseLabel } from "@/lib/derive";
import { docTotals, lineAmounts } from "@/lib/doc-math";
import { formatCurrency, formatDate, formatNumber, nowIso } from "@/lib/format";
import { FULFILMENT_STAGE, SO_STATUS } from "@/lib/operations-meta";
import { itemHref, newHref, recordHref, ROUTES } from "@/lib/routes";
import type { SalesOrderStatus } from "@/lib/types/inventory";
import type { SalesOrder } from "@/lib/types/operations";
import { cn } from "@/lib/utils";
import { customerLabel } from "./so-columns";

type Tab = "overview" | "items" | "fulfilment" | "activity";
const FLOW: SalesOrderStatus[] = ["draft", "confirmed", "partially-fulfilled", "fulfilled"];

export function SoDetailView({ id }: { id: string }) {
  const { data: so, isError } = useRecord("salesOrders", id);
  const { data: customers } = useRecords("customers");
  const { data: warehouses } = useRecords("warehouses");
  const { data: fulfilments } = useRecords("fulfilments");
  const { data: products } = useProducts();
  const update = useDocUpdate("salesOrders");
  const saveFulfilment = useSaveRecord("fulfilments");
  const confirm = useConfirmAction();
  const [tab, setTab] = useState<Tab>("overview");
  const crumbs = [{ label: "Sales & Fulfilment" }, { label: "Sales Orders", href: ROUTES.salesOrders }, { label: so?.number ?? "Sales order" }];

  if (isError) return <MissingRecord crumbs={crumbs} noun="sales order" backHref={ROUTES.salesOrders} backLabel="Back to Sales Orders" />;
  if (!so || !products) return <DetailSkeleton crumbs={crumbs} />;

  const byId = new Map(products.map((p) => [p.id, p]));
  const totals = docTotals(so.lines);
  const ful = (fulfilments ?? []).find((f) => f.soId === so.id);
  const customer = customers?.find((c) => c.id === so.customerId);
  const ordered = so.lines.reduce((s, l) => s + l.quantity, 0);
  const shipped = so.lines.reduce((s, l) => s + l.fulfilled, 0);

  const confirmOrder = () =>
    confirm.ask({
      title: "Confirm this sales order?",
      body: <p>{so.number} becomes Confirmed and is added to the Pick, Pack &amp; Ship queue. In this prototype no stock is reserved and nothing is sent to the customer.</p>,
      confirmLabel: "Confirm order",
      run: async () => {
        await update.run(so, { status: "confirmed" } as Partial<SalesOrder>, "Order confirmed and added to the fulfilment queue", `${so.number} confirmed`, "Added to Pick, Pack & Ship. No stock reserved.");
        if (!ful)
          await saveFulfilment.mutateAsync({
            id: `ful-${so.number.toLowerCase()}`,
            soId: so.id,
            stage: "to-pick",
            lines: so.lines.map((l) => ({ productId: l.productId, ordered: l.quantity, picked: 0, packed: 0 })),
            carrier: "",
            tracking: "",
            packages: 0,
            weightKg: 0,
            historical: false,
            updatedAt: nowIso(),
            activity: [{ at: nowIso(), text: "Added to the fulfilment queue", user: "Admin User" }],
          });
      },
    });

  return (
    <PageShell>
      <PageHeading
        crumbs={crumbs}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-mono">{so.number}</span>
            <ToneBadge tone={SO_STATUS[so.status]} />
          </span>
        }
        description={
          <>
            <TextLink href={recordHref("customers", so.customerId)} className="font-normal">
              {customerLabel(customers, so.customerId)}
            </TextLink>{" "}
            · ships from {warehouseLabel(warehouses, so.warehouseId)} · {formatCurrency(totals.total, { decimals: true })}
          </>
        }
        actions={
          <>
            {(so.status === "draft" || so.status === "confirmed") && (
              <OutlineButton
                icon={XCircleIcon}
                onClick={() =>
                  confirm.ask({
                    title: "Cancel this sales order?",
                    body: <p>{so.number} will be marked Cancelled{ful ? " and removed from the fulfilment queue" : ""}.</p>,
                    confirmLabel: "Cancel order",
                    destructive: true,
                    run: () => update.run(so, { status: "cancelled" } as Partial<SalesOrder>, "Order cancelled", `${so.number} cancelled`),
                  })
                }
              >
                Cancel order
              </OutlineButton>
            )}
            {so.status === "draft" && (
              <>
                <OutlineLink href={`${recordHref("salesOrders", so.id)}/edit`} icon={PencilSimpleIcon}>
                  Edit
                </OutlineLink>
                <PrimaryButton icon={CheckIcon} onClick={confirmOrder}>
                  Confirm order
                </PrimaryButton>
              </>
            )}
            {ful && so.status !== "cancelled" && (
              <PrimaryLink href={recordHref("fulfilment", ful.id)} icon={TruckIcon}>
                Open fulfilment
              </PrimaryLink>
            )}
            {so.status === "fulfilled" && (
              <OutlineLink href={newHref("salesReturns", { so: so.id })} icon={ArrowUUpLeftIcon}>
                Create return
              </OutlineLink>
            )}
          </>
        }
      />
      <Card className="mt-5 px-5 py-4">
        <StatusSteps steps={FLOW} current={so.status === "cancelled" ? "draft" : so.status} labels={Object.fromEntries(FLOW.map((s) => [s, SO_STATUS[s].label])) as Record<SalesOrderStatus, string>} cancelled={so.status === "cancelled"} />
      </Card>

      <Card className="mt-4">
        <UnderlineTabs
          idPrefix="so"
          label="Sales order sections"
          value={tab}
          onChange={setTab}
          className="px-5 pt-3"
          tabs={[
            { value: "overview", label: "Overview" },
            { value: "items", label: "Items", count: so.lines.length },
            { value: "fulfilment", label: "Fulfilment" },
            { value: "activity", label: "Activity", count: so.activity.length },
          ]}
        />
        {tab === "overview" && (
          <div id="so-panel-overview" role="tabpanel" aria-labelledby="so-tab-overview" className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <Detail label="Customer">
                <TextLink href={recordHref("customers", so.customerId)}>{customer?.name ?? "—"}</TextLink>
              </Detail>
              <Detail label="Contact">{customer ? `${customer.contactName} · ${customer.phone}` : "—"}</Detail>
              <Detail label="Order date">{formatDate(so.orderDate)}</Detail>
              <Detail label="Requested delivery">{formatDate(so.deliveryDate)}</Detail>
              <Detail label="Ship from">{warehouseLabel(warehouses, so.warehouseId)}</Detail>
              <Detail label="Created by">{so.createdBy}</Detail>
              <Detail label="Ship to" className="sm:col-span-2">
                {customer?.shippingAddress ?? "—"}
              </Detail>
              <Detail label="Notes" className="sm:col-span-2">
                {so.notes || <span className="text-ink-muted">No notes</span>}
              </Detail>
            </dl>
            <div className="rounded-xl bg-[#F9FAFB] p-4">
              <TotalsPanel totals={totals} className="max-w-none" />
              <p className="mt-3 text-[12px] leading-4 text-ink-muted">Discounts apply before tax; tax follows each item&apos;s tax class. Illustrative figures.</p>
            </div>
          </div>
        )}
        {tab === "items" && (
          <div id="so-panel-items" role="tabpanel" aria-labelledby="so-tab-items" className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[900px] border-collapse">
              <caption className="sr-only">Items on {so.number}</caption>
              <thead>
                <tr className="border-y border-line-soft bg-[#FAFAFB]">
                  {["Product", "Quantity", "Unit price", "Discount", "Tax", "Line total"].map((h, i) => (
                    <th key={h} scope="col" className={cn(th, i > 0 && "text-right")}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {so.lines.map((l) => {
                  const p = byId.get(l.productId);
                  return (
                    <tr key={l.productId} className="border-b border-line-soft">
                      <td className={td}>
                        <span className="flex items-center gap-3">
                          {p && <ProductThumb icon={p.icon} size={30} />}
                          <span className="min-w-0">
                            <TextLink href={itemHref(l.productId)} className="block truncate">
                              {p?.name}
                            </TextLink>
                            <span className="block font-mono text-[12px] leading-4 text-ink-muted">{p?.sku}</span>
                          </span>
                        </span>
                      </td>
                      <td className={cn(td, "text-right tabular-nums")}>{formatNumber(l.quantity)}</td>
                      <td className={cn(td, "text-right tabular-nums")}>{formatCurrency(l.unitPrice, { decimals: true })}</td>
                      <td className={cn(td, "text-right tabular-nums")}>{l.discount ? `${l.discount}%` : "—"}</td>
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
        {tab === "fulfilment" && (
          <div id="so-panel-fulfilment" role="tabpanel" aria-labelledby="so-tab-fulfilment" className="space-y-4 p-5">
            <div className="flex flex-wrap items-center gap-3 text-[13px] text-ink-body">
              <span>
                <span className="font-semibold text-ink tabular-nums">{formatNumber(shipped)}</span> of {formatNumber(ordered)} units fulfilled
              </span>
              {ful && <ToneBadge tone={FULFILMENT_STAGE[ful.stage]} />}
              {ful?.carrier && (
                <span className="text-ink-muted">
                  {ful.carrier}
                  {ful.tracking && ` · ${ful.tracking}`}
                </span>
              )}
            </div>
            <div className="overflow-x-auto rounded-lg border border-line scrollbar-thin">
              <table className="w-full min-w-[640px] border-collapse">
                <caption className="sr-only">Fulfilment by line</caption>
                <thead>
                  <tr className="border-b border-line-soft bg-[#FAFAFB]">
                    {["Product", "Ordered", "Fulfilled", "Remaining", "In current pick"].map((h, i) => (
                      <th key={h} scope="col" className={cn(th, i > 0 && "text-right")}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {so.lines.map((l) => {
                    const fl = ful?.lines.find((x) => x.productId === l.productId);
                    return (
                      <tr key={l.productId} className="border-b border-line-soft last:border-0">
                        <td className={td}>{byId.get(l.productId)?.name}</td>
                        <td className={cn(td, "text-right tabular-nums")}>{formatNumber(l.quantity)}</td>
                        <td className={cn(td, "text-right tabular-nums")}>{formatNumber(l.fulfilled)}</td>
                        <td className={cn(td, "text-right font-medium text-ink tabular-nums")}>{formatNumber(l.quantity - l.fulfilled)}</td>
                        <td className={cn(td, "text-right tabular-nums")}>{fl && ful?.stage !== "dispatched" ? `${fl.picked} picked` : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!ful && so.status === "draft" && <p className="text-[13px] text-ink-muted">Confirm the order to add it to the Pick, Pack &amp; Ship queue.</p>}
            {ful && (
              <OutlineLink href={recordHref("fulfilment", ful.id)} icon={TruckIcon}>
                Open in Pick, Pack &amp; Ship
              </OutlineLink>
            )}
          </div>
        )}
        {tab === "activity" && (
          <div id="so-panel-activity" role="tabpanel" aria-labelledby="so-tab-activity" className="p-5">
            <ActivityList items={so.activity} />
          </div>
        )}
      </Card>
      <PrototypeNote className="mt-4">Confirming or cancelling an order is a demo status change saved in this tab. No stock is reserved or dispatched and the customer isn&apos;t contacted.</PrototypeNote>
      {confirm.dialog}
    </PageShell>
  );
}
