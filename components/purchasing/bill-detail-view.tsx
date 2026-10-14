"use client";

import { CheckIcon, CreditCardIcon, PaperPlaneTiltIcon } from "@phosphor-icons/react/dist/ssr";
import { useDocUpdate } from "@/components/shared/doc-actions";
import { Detail, DetailGrid, DetailSkeleton, MissingRecord, TextLink } from "@/components/shared/doc-ui";
import { Card, CardHeader, OutlineButton, PageHeading, PageShell, PrimaryButton, ToneBadge, UnavailableTip } from "@/components/shared/inventory-ui";
import { useRecord, useRecords } from "@/hooks/use-operations";
import { docTotals } from "@/lib/doc-math";
import { formatCurrency, formatDate } from "@/lib/format";
import { BILL_STATUS } from "@/lib/operations-meta";
import { recordHref, ROUTES } from "@/lib/routes";
import type { SupplierBill } from "@/lib/types/operations";
import { cn } from "@/lib/utils";
import { vendorLabel } from "./po-columns";
import { PaymentsNotice } from "./supplier-bills-view";

export function BillDetailView({ id }: { id: string }) {
  const { data: b, isError } = useRecord("supplierBills", id);
  const { data: pos } = useRecords("purchaseOrders");
  const { data: vendors } = useRecords("vendors");
  const update = useDocUpdate("supplierBills");
  const crumbs = [{ label: "Purchasing" }, { label: "Supplier Bills", href: ROUTES.supplierBills }, { label: b?.number ?? "Bill" }];

  if (isError) return <MissingRecord crumbs={crumbs} noun="bill" backHref={ROUTES.supplierBills} backLabel="Back to Supplier Bills" />;
  if (!b || !pos) return <DetailSkeleton crumbs={crumbs} />;
  const po = pos.find((p) => p.id === b.poId);
  const poTotal = po ? docTotals(po.lines).total : 0;
  const received = po ? docTotals(po.lines.map((l) => ({ ...l, quantity: l.received }))).total : 0;
  const diff = b.amount - received;
  const matchRow = (label: string, value: number, strong?: boolean) => (
    <div className={cn("flex justify-between gap-4 py-1.5 text-[13px]", strong && "border-t border-line pt-2.5 font-semibold text-ink")}>
      <dt className={strong ? "" : "text-ink-muted"}>{label}</dt>
      <dd className="tabular-nums">{formatCurrency(value, { decimals: true })}</dd>
    </div>
  );

  return (
    <PageShell>
      <PageHeading
        crumbs={crumbs}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-mono">{b.number}</span>
            <ToneBadge tone={BILL_STATUS[b.status]} />
          </span>
        }
        description={`${vendorLabel(vendors, b.vendorId)} · vendor bill ${b.vendorBillNo}`}
        actions={
          <>
            {b.status === "draft" && (
              <PrimaryButton icon={PaperPlaneTiltIcon} onClick={() => void update.run(b, { status: "awaiting-review" } as Partial<SupplierBill>, null, "Sent for review")}>
                Send for review
              </PrimaryButton>
            )}
            {b.status === "awaiting-review" && (
              <PrimaryButton icon={CheckIcon} onClick={() => void update.run(b, { status: b.dueDate < new Date().toISOString().slice(0, 10) ? "overdue" : "due" } as Partial<SupplierBill>, null, "Bill approved", "Marked due for payment in this demo — nothing is paid.")}>
                Approve bill
              </PrimaryButton>
            )}
            <UnavailableTip reason="Payments aren't connected in this prototype">
              <OutlineButton icon={CreditCardIcon} disabled>
                Record payment
              </OutlineButton>
            </UnavailableTip>
          </>
        }
      />
      <PaymentsNotice className="mt-5" />
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Bill details" />
          <DetailGrid className="lg:grid-cols-2">
            <Detail label="Vendor">
              <TextLink href={recordHref("vendors", b.vendorId)}>{vendorLabel(vendors, b.vendorId)}</TextLink>
            </Detail>
            <Detail label="Vendor bill number" mono>
              {b.vendorBillNo}
            </Detail>
            <Detail label="Purchase order">{po ? <TextLink href={recordHref("purchaseOrders", po.id)} className="font-mono">{po.number}</TextLink> : "—"}</Detail>
            <Detail label="Amount (incl. tax)">{formatCurrency(b.amount, { decimals: true })}</Detail>
            <Detail label="Bill date">{formatDate(b.billDate)}</Detail>
            <Detail label="Due date">{formatDate(b.dueDate)}</Detail>
            <Detail label="Status">{BILL_STATUS[b.status].label}</Detail>
            <Detail label="Notes" className="sm:col-span-2">
              {b.notes || <span className="text-ink-muted">No notes</span>}
            </Detail>
          </DetailGrid>
        </Card>
        <Card>
          <CardHeader title="Match to purchase order" subtitle="Illustrative check of bill vs. PO and received value" />
          {po ? (
            <div className="px-5 pb-5">
              <dl>
                {matchRow("PO total (ordered)", poTotal)}
                {matchRow("Received value", received)}
                {matchRow("Bill amount", b.amount, true)}
              </dl>
              <p className={cn("mt-3 rounded-lg px-3 py-2 text-[12.5px]", Math.abs(diff) <= 1 ? "bg-[var(--success-bg)] text-[var(--success)]" : "bg-[var(--warning-bg)] text-[var(--warning)]")}>
                {Math.abs(diff) <= 1 ? "Bill matches the received value." : `Bill is ${formatCurrency(Math.abs(diff), { decimals: true })} ${diff > 0 ? "more" : "less"} than the received value.`}
              </p>
            </div>
          ) : (
            <p className="px-5 pb-5 text-[13px] text-ink-muted">The related purchase order isn&apos;t available.</p>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
