"use client";

import { useMemo, useState } from "react";
import { CheckCircleIcon, ClipboardTextIcon, FloppyDiskIcon, PlayIcon, XCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { matches } from "@/components/shared/data-table";
import { useConfirmAction, useDocUpdate } from "@/components/shared/doc-actions";
import { Detail, DetailGrid, DetailSkeleton, MissingRecord, PrototypeNote, StatRow, StatTile, StatusSteps, TextLink } from "@/components/shared/doc-ui";
import { Card, CardHeader, fieldClass, OutlineButton, PageHeading, PageShell, PrimaryButton, SearchInput, td, th, ToneBadge, UnderlineTabs } from "@/components/shared/inventory-ui";
import { ProductThumb } from "@/components/shared/product-thumb";
import { EmptyState } from "@/components/shared/state-panels";
import { useProducts, useRecord, useRecords } from "@/hooks/use-operations";
import { binFor, warehouseLabel } from "@/lib/derive";
import { formatCurrency, formatDate, formatNumber, formatSigned } from "@/lib/format";
import { STOCKTAKE_STATUS } from "@/lib/operations-meta";
import { itemHref, recordHref, ROUTES } from "@/lib/routes";
import type { Stocktake, StocktakeStatus } from "@/lib/types/operations";
import { cn } from "@/lib/utils";

type Tab = "count" | "review" | "details";
const FLOW: StocktakeStatus[] = ["scheduled", "in-progress", "in-review", "completed"];

export function StocktakeDetailView({ id }: { id: string }) {
  const { data: s, isError } = useRecord("stocktakes", id);
  const { data: warehouses } = useRecords("warehouses");
  const { data: products } = useProducts();
  const update = useDocUpdate("stocktakes");
  const confirm = useConfirmAction();
  const [tab, setTab] = useState<Tab | null>(null);
  const [q, setQ] = useState("");
  const [blind, setBlind] = useState(false);
  // Counts typed but not yet saved, by product id.
  const [draft, setDraft] = useState<Record<string, string>>({});
  const crumbs = [{ label: "Inventory" }, { label: "Stocktakes", href: ROUTES.stocktakes }, { label: s?.number ?? "Stocktake" }];
  const byId = useMemo(() => new Map((products ?? []).map((p) => [p.id, p])), [products]);

  if (isError) return <MissingRecord crumbs={crumbs} noun="stocktake" backHref={ROUTES.stocktakes} backLabel="Back to Stocktakes" />;
  if (!s || !products) return <DetailSkeleton crumbs={crumbs} />;

  const editable = s.status === "in-progress";
  const current: Tab = tab ?? (s.status === "in-review" || s.status === "completed" ? "review" : "count");
  const zones = warehouses?.find((w) => w.id === s.warehouseId)?.zones ?? [];
  const valueOf = (input: string | undefined, saved: number | null) => (input !== undefined ? (input.trim() === "" ? null : Number(input)) : saved);
  const lines = s.lines.map((l) => ({ ...l, counted: valueOf(draft[l.productId], l.counted) }));
  const invalid = Object.entries(draft).filter(([, v]) => v.trim() !== "" && !/^\d+$/.test(v.trim()));
  const counted = lines.filter((l) => l.counted !== null);
  const variances = counted.filter((l) => l.counted !== l.expected);
  const varianceUnits = variances.reduce((n, l) => n + (l.counted! - l.expected), 0);
  const varianceValue = variances.reduce((n, l) => n + (l.counted! - l.expected) * (byId.get(l.productId)?.costPrice ?? 0), 0);
  const dirty = Object.keys(draft).length > 0;

  const saveCounts = async (next?: StocktakeStatus, log?: string) => {
    if (invalid.length) {
      toast.error("Counts must be whole numbers", { description: `${invalid.length} line(s) need fixing.` });
      return;
    }
    await update.run(s, { lines, ...(next ? { status: next } : {}) } as Partial<Stocktake>, log ?? null, next ? `${s.number}: ${STOCKTAKE_STATUS[next].label}` : "Counts saved", "Saved in this browser tab only. Stock balances are unchanged.");
    setDraft({});
  };

  const visible = lines.filter((l) => {
    const p = byId.get(l.productId);
    return matches(q, p?.name, p?.sku);
  });

  const actions = (
    <>
      {(s.status === "scheduled" || s.status === "in-progress") && (
        <OutlineButton
          icon={XCircleIcon}
          onClick={() =>
            confirm.ask({ title: "Cancel this stocktake?", body: <p>{s.number} will be marked Cancelled.</p>, confirmLabel: "Cancel stocktake", destructive: true, run: () => update.run(s, { status: "cancelled" } as Partial<Stocktake>, null, `${s.number} cancelled`) })
          }
        >
          Cancel
        </OutlineButton>
      )}
      {s.status === "scheduled" && (
        <PrimaryButton icon={PlayIcon} onClick={() => void update.run(s, { status: "in-progress" } as Partial<Stocktake>, null, "Counting started")}>
          Start counting
        </PrimaryButton>
      )}
      {editable && (
        <>
          <OutlineButton icon={FloppyDiskIcon} disabled={!dirty || update.pending} onClick={() => void saveCounts()}>
            Save counts
          </OutlineButton>
          <PrimaryButton
            icon={CheckCircleIcon}
            onClick={() =>
              confirm.ask({
                title: "Submit counts for review?",
                body: (
                  <p>
                    {counted.length} of {lines.length} products counted.
                    {counted.length < lines.length && " Uncounted lines will be shown as not counted in the review."}
                  </p>
                ),
                confirmLabel: "Submit for review",
                run: () => saveCounts("in-review").then(() => setTab("review")),
              })
            }
          >
            Submit for review
          </PrimaryButton>
        </>
      )}
      {s.status === "in-review" && (
        <>
          <OutlineButton onClick={() => void update.run(s, { status: "in-progress" } as Partial<Stocktake>, null, "Reopened for counting").then(() => setTab("count"))}>Reopen count</OutlineButton>
          <PrimaryButton
            icon={CheckCircleIcon}
            onClick={() =>
              confirm.ask({
                title: "Complete this stocktake?",
                body: (
                  <p>
                    The review will be closed with {variances.length} variance line(s) ({formatSigned(varianceUnits)} units). In this prototype <span className="font-medium text-ink">no adjustments are posted</span> and stock balances stay as they are.
                  </p>
                ),
                confirmLabel: "Complete review",
                run: () => update.run(s, { status: "completed" } as Partial<Stocktake>, null, `${s.number} completed`, "Variances recorded for review only — nothing posted."),
              })
            }
          >
            Complete review
          </PrimaryButton>
        </>
      )}
    </>
  );

  return (
    <PageShell>
      <PageHeading
        crumbs={crumbs}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-mono">{s.number}</span>
            <ToneBadge tone={STOCKTAKE_STATUS[s.status]} />
          </span>
        }
        description={`${warehouseLabel(warehouses, s.warehouseId)} · ${s.category || "All products"} · ${formatDate(s.countDate)} · ${s.assignee}`}
        actions={actions}
      />
      <Card className="mt-5 px-5 py-4">
        <StatusSteps steps={FLOW} current={s.status === "cancelled" ? "scheduled" : s.status} labels={{ scheduled: "Scheduled", "in-progress": "Counting", "in-review": "Review", completed: "Completed", cancelled: "Cancelled" }} cancelled={s.status === "cancelled"} />
      </Card>
      <StatRow className="mt-4">
        <StatTile label="Counted" value={`${counted.length} / ${lines.length}`} note={`${lines.length ? Math.round((counted.length / lines.length) * 100) : 0}% complete`} icon={ClipboardTextIcon} tone="brand" />
        <StatTile label="Lines with variance" value={formatNumber(variances.length)} />
        <StatTile label="Net variance (units)" value={formatSigned(varianceUnits)} />
        <StatTile label="Net variance (at cost)" value={`${varianceValue < 0 ? "−" : ""}${formatCurrency(Math.abs(varianceValue))}`} note="Illustrative, from item cost price" tone="coral" />
      </StatRow>

      <Card className="mt-4">
        <UnderlineTabs
          idPrefix="stk"
          label="Stocktake sections"
          value={current}
          onChange={setTab}
          className="px-5 pt-3"
          tabs={[
            { value: "count", label: "Count entry", count: lines.length },
            { value: "review", label: "Review variances", count: variances.length },
            { value: "details", label: "Details" },
          ]}
        />
        {current === "count" && (
          <div id="stk-panel-count" role="tabpanel" aria-labelledby="stk-tab-count">
            <div className="flex flex-wrap items-center gap-3 px-4 pt-4 pb-3 sm:px-5">
              <SearchInput value={q} onChange={setQ} placeholder="Find product or SKU…" label="Find product" className="w-full sm:w-[280px]" />
              <label className="flex items-center gap-2 text-[13px] text-ink-body">
                <Checkbox checked={blind} onCheckedChange={(v) => setBlind(v === true)} /> Blind count (hide expected)
              </label>
              {!editable && <span className="text-[12.5px] text-ink-muted">{s.status === "scheduled" ? "Start counting to enter quantities." : "Counts are locked in this status."}</span>}
              {dirty && <span className="ml-auto text-[12.5px] font-medium text-[var(--warning)]">Unsaved counts</span>}
            </div>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[760px] border-collapse">
                <caption className="sr-only">Count entry for {s.number}</caption>
                <thead>
                  <tr className="border-y border-line-soft bg-[#FAFAFB]">
                    <th scope="col" className={th}>
                      Product
                    </th>
                    <th scope="col" className={th}>
                      Bin
                    </th>
                    <th scope="col" className={cn(th, "text-right")}>
                      Expected
                    </th>
                    <th scope="col" className={cn(th, "w-36 text-right")}>
                      Counted
                    </th>
                    <th scope="col" className={cn(th, "text-right")}>
                      Variance
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((l) => {
                    const p = byId.get(l.productId);
                    const raw = draft[l.productId] ?? (l.counted === null ? "" : String(l.counted));
                    const bad = raw.trim() !== "" && !/^\d+$/.test(raw.trim());
                    const v = l.counted === null || bad ? null : l.counted - l.expected;
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
                        <td className={cn(td, "font-mono text-[12.5px]")}>{p ? binFor(p.id, p.category, p.costPrice, zones) : "—"}</td>
                        <td className={cn(td, "text-right tabular-nums")}>{blind && editable ? <span className="text-ink-faint">Hidden</span> : formatNumber(l.expected)}</td>
                        <td className={cn(td, "text-right")}>
                          {editable ? (
                            <input
                              value={raw}
                              onChange={(e) => setDraft({ ...draft, [l.productId]: e.target.value })}
                              inputMode="numeric"
                              aria-label={`Counted quantity for ${p?.name}`}
                              aria-invalid={bad || undefined}
                              placeholder="—"
                              className={cn(fieldClass, "text-right tabular-nums")}
                            />
                          ) : (
                            <span className="tabular-nums">{l.counted === null ? <span className="text-ink-muted">Not counted</span> : formatNumber(l.counted)}</span>
                          )}
                        </td>
                        <td className={cn(td, "text-right font-medium tabular-nums", v === null ? "text-ink-faint" : v < 0 ? "text-[var(--danger)]" : v > 0 ? "text-[var(--success)]" : "text-ink-muted")}>
                          {blind && editable ? "—" : v === null ? "—" : formatSigned(v)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {visible.length === 0 && <EmptyState icon={ClipboardTextIcon} title="No products match" />}
          </div>
        )}
        {current === "review" && (
          <div id="stk-panel-review" role="tabpanel" aria-labelledby="stk-tab-review">
            {variances.length === 0 ? (
              <EmptyState icon={CheckCircleIcon} title={counted.length ? "No variances" : "Nothing counted yet"} hint={counted.length ? "Every counted line matches the expected quantity." : "Enter counts to see differences here."} />
            ) : (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full min-w-[720px] border-collapse">
                  <caption className="sr-only">Variances for {s.number}</caption>
                  <thead>
                    <tr className="border-y border-line-soft bg-[#FAFAFB]">
                      <th scope="col" className={th}>
                        Product
                      </th>
                      <th scope="col" className={cn(th, "text-right")}>
                        Expected
                      </th>
                      <th scope="col" className={cn(th, "text-right")}>
                        Counted
                      </th>
                      <th scope="col" className={cn(th, "text-right")}>
                        Variance
                      </th>
                      <th scope="col" className={cn(th, "text-right")}>
                        Variance at cost
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {variances.map((l) => {
                      const p = byId.get(l.productId);
                      const v = l.counted! - l.expected;
                      return (
                        <tr key={l.productId} className="border-b border-line-soft">
                          <td className={td}>
                            <TextLink href={itemHref(l.productId)}>{p?.name}</TextLink> <span className="font-mono text-[12px] text-ink-muted">{p?.sku}</span>
                          </td>
                          <td className={cn(td, "text-right tabular-nums")}>{formatNumber(l.expected)}</td>
                          <td className={cn(td, "text-right tabular-nums")}>{formatNumber(l.counted!)}</td>
                          <td className={cn(td, "text-right font-semibold tabular-nums", v < 0 ? "text-[var(--danger)]" : "text-[var(--success)]")}>{formatSigned(v)}</td>
                          <td className={cn(td, "text-right tabular-nums")}>
                            {v < 0 ? "−" : "+"}
                            {formatCurrency(Math.abs(v * (p?.costPrice ?? 0)))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#FAFAFB]">
                      <th scope="row" className={cn(td, "text-left font-semibold text-ink")} colSpan={3}>
                        Net variance
                      </th>
                      <td className={cn(td, "text-right font-semibold text-ink tabular-nums")}>{formatSigned(varianceUnits)}</td>
                      <td className={cn(td, "text-right font-semibold text-ink tabular-nums")}>
                        {varianceValue < 0 ? "−" : "+"}
                        {formatCurrency(Math.abs(varianceValue))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
            <p className="px-5 py-3 text-[12px] leading-4 text-ink-muted">Variance = counted − expected. Expected quantities were captured when the stocktake was created. Nothing here is posted as a stock adjustment.</p>
          </div>
        )}
        {current === "details" && (
          <div id="stk-panel-details" role="tabpanel" aria-labelledby="stk-tab-details">
            <CardHeader title="Details" />
            <DetailGrid>
              <Detail label="Warehouse">
                <TextLink href={recordHref("warehouses", s.warehouseId)}>{warehouseLabel(warehouses, s.warehouseId)}</TextLink>
              </Detail>
              <Detail label="Count date">{formatDate(s.countDate)}</Detail>
              <Detail label="Assigned to">{s.assignee}</Detail>
              <Detail label="Scope">{s.category || "All active products"}</Detail>
              <Detail label="Status">{STOCKTAKE_STATUS[s.status].label}</Detail>
              <Detail label="Notes">{s.notes || <span className="text-ink-muted">No notes</span>}</Detail>
            </DetailGrid>
          </div>
        )}
      </Card>
      <PrototypeNote className="mt-4">Counts and variances are kept in this browser tab for review. Completing the stocktake does not create stock adjustments or change balances.</PrototypeNote>
      {confirm.dialog}
    </PageShell>
  );
}
