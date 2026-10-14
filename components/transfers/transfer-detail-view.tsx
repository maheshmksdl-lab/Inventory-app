"use client";

import { ArrowRightIcon, CheckIcon, PaperPlaneTiltIcon, TruckIcon, XCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { useConfirmAction, useDocUpdate } from "@/components/shared/doc-actions";
import { ActivityList, Detail, DetailGrid, DetailSkeleton, MissingRecord, PrototypeNote, StatusSteps, TextLink } from "@/components/shared/doc-ui";
import { Card, CardHeader, OutlineButton, PageHeading, PageShell, PrimaryButton, td, th, ToneBadge } from "@/components/shared/inventory-ui";
import { ProductThumb } from "@/components/shared/product-thumb";
import { useProducts, useRecord, useRecords } from "@/hooks/use-operations";
import { warehouseLabel } from "@/lib/derive";
import { formatDate, formatNumber } from "@/lib/format";
import { available } from "@/lib/inventory-meta";
import { TRANSFER_FLOW, TRANSFER_STATUS } from "@/lib/operations-meta";
import { itemHref, recordHref, ROUTES } from "@/lib/routes";
import type { StockTransfer, TransferStatus } from "@/lib/types/operations";
import { cn } from "@/lib/utils";

const NEXT: Partial<Record<TransferStatus, { to: TransferStatus; label: string; log: string; icon: typeof CheckIcon }>> = {
  draft: { to: "submitted", label: "Submit for approval", log: "Submitted for approval", icon: PaperPlaneTiltIcon },
  submitted: { to: "approved", label: "Approve", log: "Approved", icon: CheckIcon },
  approved: { to: "in-transit", label: "Mark in transit", log: "Marked in transit (simulated)", icon: TruckIcon },
  "in-transit": { to: "received", label: "Mark received", log: "Marked received (simulated — no stock moved)", icon: CheckIcon },
};

export function TransferDetailView({ id }: { id: string }) {
  const { data: t, isError } = useRecord("transfers", id);
  const { data: warehouses } = useRecords("warehouses");
  const { data: products } = useProducts();
  const update = useDocUpdate("transfers");
  const confirm = useConfirmAction();
  const crumbs = [{ label: "Inventory" }, { label: "Stock Transfers", href: ROUTES.transfers }, { label: t?.number ?? "Transfer" }];

  if (isError) return <MissingRecord crumbs={crumbs} noun="transfer" backHref={ROUTES.transfers} backLabel="Back to Transfers" />;
  if (!t || !products) return <DetailSkeleton crumbs={crumbs} />;

  const byId = new Map(products.map((p) => [p.id, p]));
  const next = NEXT[t.status];
  const canCancel = t.status !== "received" && t.status !== "cancelled";
  const total = t.lines.reduce((s, l) => s + l.quantity, 0);
  const availAt = (productId: string, w: string) => {
    const b = byId.get(productId)?.stock.find((s) => s.warehouseId === w);
    return b ? available(b) : null;
  };

  const advance = () => {
    if (!next) return;
    const go = () => update.run(t, { status: next.to } as Partial<StockTransfer>, next.log, `${t.number}: ${TRANSFER_STATUS[next.to].label}`, "Demo status only — stock balances are unchanged.");
    if (next.to === "received" || next.to === "in-transit") {
      confirm.ask({
        title: next.to === "received" ? "Mark this transfer received?" : "Mark this transfer in transit?",
        body: <p>This changes the demo status of {t.number} only. In this prototype no stock leaves {warehouseLabel(warehouses, t.from)} and none arrives at {warehouseLabel(warehouses, t.to)}.</p>,
        confirmLabel: next.label,
        run: go,
      });
    } else void go();
  };

  return (
    <PageShell>
      <PageHeading
        crumbs={crumbs}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-mono">{t.number}</span>
            <ToneBadge tone={TRANSFER_STATUS[t.status]} />
          </span>
        }
        description={
          <span className="inline-flex flex-wrap items-center gap-1.5">
            {warehouseLabel(warehouses, t.from)} <ArrowRightIcon size={13} aria-hidden /> {warehouseLabel(warehouses, t.to)} · {formatNumber(total)} units
          </span>
        }
        actions={
          <>
            {canCancel && (
              <OutlineButton
                icon={XCircleIcon}
                onClick={() =>
                  confirm.ask({
                    title: "Cancel this transfer?",
                    body: <p>{t.number} will be marked Cancelled. This can&apos;t be undone in the prototype.</p>,
                    confirmLabel: "Cancel transfer",
                    destructive: true,
                    run: () => update.run(t, { status: "cancelled" } as Partial<StockTransfer>, "Transfer cancelled", `${t.number} cancelled`),
                  })
                }
              >
                Cancel transfer
              </OutlineButton>
            )}
            {next && (
              <PrimaryButton icon={next.icon} onClick={advance} disabled={update.pending}>
                {next.label}
              </PrimaryButton>
            )}
          </>
        }
      />
      <Card className="mt-5 px-5 py-4">
        <StatusSteps steps={TRANSFER_FLOW} current={t.status === "cancelled" ? "draft" : t.status} labels={Object.fromEntries(TRANSFER_FLOW.map((s) => [s, TRANSFER_STATUS[s].label])) as Record<TransferStatus, string>} cancelled={t.status === "cancelled"} />
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Products" subtitle={`${t.lines.length} line(s) · ${formatNumber(total)} units`} />
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[620px] border-collapse">
                <caption className="sr-only">Products on {t.number}</caption>
                <thead>
                  <tr className="border-y border-line-soft bg-[#FAFAFB]">
                    <th scope="col" className={th}>
                      Product
                    </th>
                    <th scope="col" className={cn(th, "text-right")}>
                      Quantity
                    </th>
                    <th scope="col" className={cn(th, "text-right")}>
                      Available at source now
                    </th>
                    <th scope="col" className={cn(th, "text-right")}>
                      Available at destination now
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {t.lines.map((l) => {
                    const p = byId.get(l.productId);
                    const src = availAt(l.productId, t.from);
                    const dst = availAt(l.productId, t.to);
                    return (
                      <tr key={l.productId} className="border-b border-line-soft last:border-0">
                        <td className={td}>
                          <span className="flex items-center gap-3">
                            {p && <ProductThumb icon={p.icon} size={32} />}
                            <span className="min-w-0">
                              <TextLink href={itemHref(l.productId)} className="block truncate font-semibold">
                                {p?.name ?? l.productId}
                              </TextLink>
                              <span className="block font-mono text-[12px] leading-4 text-ink-muted">{p?.sku}</span>
                            </span>
                          </span>
                        </td>
                        <td className={cn(td, "text-right font-semibold text-ink tabular-nums")}>{formatNumber(l.quantity)}</td>
                        <td className={cn(td, "text-right tabular-nums")}>{src === null ? "—" : formatNumber(src)}</td>
                        <td className={cn(td, "text-right tabular-nums")}>{dst === null ? "—" : formatNumber(dst)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
          <PrototypeNote>Transfer statuses are simulated. Marking a transfer in transit or received does not change stock in either warehouse, and no movement is added to the ledger.</PrototypeNote>
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Details" />
            <DetailGrid className="lg:grid-cols-2">
              <Detail label="From">
                <TextLink href={recordHref("warehouses", t.from)}>{warehouseLabel(warehouses, t.from)}</TextLink>
              </Detail>
              <Detail label="To">
                <TextLink href={recordHref("warehouses", t.to)}>{warehouseLabel(warehouses, t.to)}</TextLink>
              </Detail>
              <Detail label="Created">{formatDate(t.createdDate)}</Detail>
              <Detail label="Expected arrival">{formatDate(t.expectedDate)}</Detail>
              <Detail label="Created by">{t.createdBy}</Detail>
              <Detail label="Status">{TRANSFER_STATUS[t.status].label}</Detail>
              <Detail label="Notes" className="sm:col-span-2">
                {t.notes || <span className="text-ink-muted">No notes</span>}
              </Detail>
            </DetailGrid>
          </Card>
          <ActivityList items={t.activity} />
        </div>
      </div>
      {confirm.dialog}
    </PageShell>
  );
}
