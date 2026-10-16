"use client";

import { useState } from "react";
import { CheckIcon, ClipboardTextIcon, TrayArrowDownIcon, XCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { useConfirmAction, useDocUpdate } from "@/components/shared/doc-actions";
import { Detail, DetailGrid, DetailSkeleton, MissingRecord, PrototypeNote, StatusSteps, TextLink } from "@/components/shared/doc-ui";
import { Card, CardHeader, OutlineButton, PageHeading, PageShell, PrimaryButton, SelectField, td, th, ToneBadge } from "@/components/shared/inventory-ui";
import { ProductThumb } from "@/components/shared/product-thumb";
import { useProducts, useRecord, useRecords } from "@/hooks/use-operations";
import { warehouseLabel } from "@/lib/derive";
import { formatDate, formatNumber } from "@/lib/format";
import { RETURN_OUTCOME, RETURN_STATUS } from "@/lib/operations-meta";
import { itemHref, recordHref, ROUTES } from "@/lib/routes";
import type { ReturnOutcome, ReturnStatus, SalesReturn } from "@/lib/types/operations";
import { cn } from "@/lib/utils";
import { customerLabel } from "./so-columns";

const FLOW: ReturnStatus[] = ["requested", "received", "inspected", "closed"];
const OUTCOME_HELP: Record<Exclude<ReturnOutcome, "">, string> = {
  restock: "Back to sellable stock",
  quarantine: "Held for repair or vendor return",
  "write-off": "Not recoverable",
};

export function ReturnDetailView({ id }: { id: string }) {
  const { data: r, isError } = useRecord("salesReturns", id);
  const { data: sos } = useRecords("salesOrders");
  const { data: customers } = useRecords("customers");
  const { data: warehouses } = useRecords("warehouses");
  const { data: products } = useProducts();
  const update = useDocUpdate("salesReturns");
  const confirm = useConfirmAction();
  const [draft, setDraft] = useState<Record<string, ReturnOutcome>>({});
  const [error, setError] = useState("");
  const crumbs = [{ label: "Sales & Fulfilment" }, { label: "Sales Returns", href: ROUTES.salesReturns }, { label: r?.number ?? "Return" }];

  if (isError) return <MissingRecord crumbs={crumbs} noun="return" backHref={ROUTES.salesReturns} backLabel="Back to Sales Returns" />;
  if (!r || !products) return <DetailSkeleton crumbs={crumbs} />;
  const so = sos?.find((s) => s.id === r.soId);
  const byId = new Map(products.map((p) => [p.id, p]));
  const inspecting = r.status === "received";
  const outcomeOf = (productId: string, saved: ReturnOutcome) => draft[productId] ?? saved;
  const set = (status: ReturnStatus, title: string, patch: Partial<SalesReturn> = {}) => update.run(r, { status, ...patch } as Partial<SalesReturn>, null, title, "Saved in this tab only — inventory is unchanged.");

  const saveInspection = () => {
    const lines = r.lines.map((l) => ({ ...l, outcome: outcomeOf(l.productId, l.outcome) }));
    if (lines.some((l) => !l.outcome)) {
      setError("Choose an outcome for every item.");
      return;
    }
    setError("");
    void set("inspected", "Inspection recorded", { lines }).then(() => setDraft({}));
  };

  return (
    <PageShell>
      <PageHeading
        crumbs={crumbs}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-mono">{r.number}</span>
            <ToneBadge tone={RETURN_STATUS[r.status]} />
          </span>
        }
        description={`${customerLabel(customers, r.customerId)} · to ${warehouseLabel(warehouses, r.warehouseId)} · requested ${formatDate(r.requestedDate)}`}
        actions={
          <>
            {r.status === "requested" && (
              <>
                <OutlineButton
                  icon={XCircleIcon}
                  onClick={() => confirm.ask({ title: "Reject this return?", body: <p>{r.number} will be marked Rejected.</p>, confirmLabel: "Reject return", destructive: true, run: () => set("rejected", `${r.number} rejected`) })}
                >
                  Reject
                </OutlineButton>
                <PrimaryButton icon={TrayArrowDownIcon} onClick={() => void set("received", "Marked as received")}>
                  Mark received
                </PrimaryButton>
              </>
            )}
            {inspecting && (
              <PrimaryButton icon={ClipboardTextIcon} onClick={saveInspection}>
                Save inspection
              </PrimaryButton>
            )}
            {r.status === "inspected" && (
              <PrimaryButton
                icon={CheckIcon}
                onClick={() =>
                  confirm.ask({
                    title: "Close this return?",
                    body: <p>The outcomes stay on record. In this prototype restocked units are not added back to stock and write-offs are not posted.</p>,
                    confirmLabel: "Close return",
                    run: () => set("closed", `${r.number} closed`),
                  })
                }
              >
                Close return
              </PrimaryButton>
            )}
          </>
        }
      />
      <Card className="mt-5 px-5 py-4">
        <StatusSteps steps={FLOW} current={r.status === "rejected" ? "requested" : r.status} labels={{ requested: "Requested", received: "Received", inspected: "Inspected", closed: "Closed", rejected: "Rejected" }} cancelled={r.status === "rejected"} />
      </Card>
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Returned items" subtitle={inspecting ? "Choose an inspection outcome for each item" : undefined} />
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[680px] border-collapse">
              <caption className="sr-only">Items on {r.number}</caption>
              <thead>
                <tr className="border-y border-line-soft bg-[#FAFAFB]">
                  <th scope="col" className={th}>
                    Product
                  </th>
                  <th scope="col" className={cn(th, "text-right")}>
                    Qty
                  </th>
                  <th scope="col" className={th}>
                    Reason
                  </th>
                  <th scope="col" className={cn(th, "w-56")}>
                    Inspection outcome
                  </th>
                </tr>
              </thead>
              <tbody>
                {r.lines.map((l) => {
                  const p = byId.get(l.productId);
                  const o = outcomeOf(l.productId, l.outcome);
                  return (
                    <tr key={l.productId} className="border-b border-line-soft last:border-0">
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
                      <td className={cn(td, "text-right tabular-nums")}>{formatNumber(l.quantity)}</td>
                      <td className={td}>{l.reason}</td>
                      <td className={td}>
                        {inspecting ? (
                          <SelectField
                            id={`rma-outcome-${l.productId}`}
                            value={o}
                            onChange={(v) => setDraft({ ...draft, [l.productId]: v as ReturnOutcome })}
                            options={(Object.keys(RETURN_OUTCOME) as Exclude<ReturnOutcome, "">[]).map((k) => ({ value: k, label: `${RETURN_OUTCOME[k].label} — ${OUTCOME_HELP[k]}` }))}
                            placeholder="Choose outcome"
                          />
                        ) : o ? (
                          <ToneBadge tone={RETURN_OUTCOME[o]} />
                        ) : (
                          <span className="text-ink-muted">{r.status === "rejected" ? "—" : "After inspection"}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {error && <p className="px-5 py-2 text-[12px] font-medium text-[#DC2626]">{error}</p>}
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Details" />
            <DetailGrid className="lg:grid-cols-2">
              <Detail label="Original order">{so ? <TextLink href={recordHref("salesOrders", so.id)} className="font-mono">{so.number}</TextLink> : "—"}</Detail>
              <Detail label="Customer">
                <TextLink href={recordHref("customers", r.customerId)}>{customerLabel(customers, r.customerId)}</TextLink>
              </Detail>
              <Detail label="Return to">{warehouseLabel(warehouses, r.warehouseId)}</Detail>
              <Detail label="Requested">{formatDate(r.requestedDate)}</Detail>
              <Detail label="Created by">{r.createdBy}</Detail>
              <Detail label="Status">{RETURN_STATUS[r.status].label}</Detail>
              <Detail label="Notes" className="sm:col-span-2">
                {r.notes || <span className="text-ink-muted">No notes</span>}
              </Detail>
            </DetailGrid>
          </Card>
          <PrototypeNote>Outcomes are frontend-only: Restock doesn&apos;t add units back, Quarantine doesn&apos;t move them, and Write-off doesn&apos;t post a loss.</PrototypeNote>
        </div>
      </div>
      {confirm.dialog}
    </PageShell>
  );
}
