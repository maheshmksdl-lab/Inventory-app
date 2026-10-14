"use client";

import { useState } from "react";
import { CheckIcon, CubeIcon, HandGrabbingIcon, PackageIcon, TruckIcon } from "@phosphor-icons/react/dist/ssr";
import { customerLabel } from "@/components/sales/so-columns";
import { useConfirmAction, useDocUpdate } from "@/components/shared/doc-actions";
import { ActivityList, DetailSkeleton, MissingRecord, PrototypeNote, StatusSteps, TextLink } from "@/components/shared/doc-ui";
import { Card, CardHeader, fieldClass, FormField, OutlineButton, PageHeading, PageShell, PrimaryButton, SelectField, td, th, ToneBadge, UnavailableTip } from "@/components/shared/inventory-ui";
import { ProductThumb } from "@/components/shared/product-thumb";
import { useProducts, useRecord, useRecords } from "@/hooks/use-operations";
import { binFor, warehouseLabel } from "@/lib/derive";
import { formatDate, formatNumber, nowIso } from "@/lib/format";
import { CARRIERS, FULFILMENT_FLOW, FULFILMENT_STAGE } from "@/lib/operations-meta";
import { itemHref, recordHref, ROUTES } from "@/lib/routes";
import type { Fulfilment } from "@/lib/types/operations";
import { cn } from "@/lib/utils";

export function FulfilmentDetailView({ id }: { id: string }) {
  const { data: f, isError } = useRecord("fulfilments", id);
  const { data: sos } = useRecords("salesOrders");
  const { data: customers } = useRecords("customers");
  const { data: warehouses } = useRecords("warehouses");
  const { data: products } = useProducts();
  const update = useDocUpdate("fulfilments");
  const confirm = useConfirmAction();
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [ship, setShip] = useState<{ carrier: string; tracking: string; packages: string; weight: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const so = sos?.find((s) => s.id === f?.soId);
  const crumbs = [{ label: "Sales & Fulfilment" }, { label: "Pick, Pack & Ship", href: ROUTES.fulfilment }, { label: so?.number ?? "Fulfilment" }];

  if (isError) return <MissingRecord crumbs={crumbs} noun="fulfilment" backHref={ROUTES.fulfilment} backLabel="Back to Pick, Pack & Ship" />;
  if (!f || !so || !products) return <DetailSkeleton crumbs={crumbs} />;

  const byId = new Map(products.map((p) => [p.id, p]));
  const zones = warehouses?.find((w) => w.id === so.warehouseId)?.zones ?? [];
  const canPick = f.stage === "to-pick" || f.stage === "picking";
  const pickedOf = (productId: string, saved: number) => {
    const raw = picks[productId];
    return raw === undefined ? saved : /^\d+$/.test(raw) ? Number(raw) : NaN;
  };
  const lines = f.lines.map((l) => ({ ...l, picked: pickedOf(l.productId, l.picked) }));
  const allPicked = lines.every((l) => l.picked === l.ordered);
  const s = ship ?? { carrier: f.carrier, tracking: f.tracking, packages: f.packages ? String(f.packages) : "1", weight: f.weightKg ? String(f.weightKg) : "" };
  const log = (text: string) => [{ at: nowIso(), text, user: "Admin User" }, ...f.activity];
  const patch = (p: Partial<Fulfilment>, title: string, text: string) => update.run(f, { ...p, updatedAt: nowIso(), activity: log(text) } as Partial<Fulfilment>, null, title, "Demo status only — nothing has physically moved.");

  const savePicks = () => {
    const bad = lines.filter((l) => Number.isNaN(l.picked) || l.picked > l.ordered);
    if (bad.length) {
      setErrors(Object.fromEntries(bad.map((l) => [l.productId, Number.isNaN(l.picked) ? "Whole number" : `Max ${l.ordered}`])));
      return;
    }
    setErrors({});
    void patch({ lines, stage: "picking" }, "Picks saved", `Picked ${lines.reduce((n, l) => n + l.picked, 0)} of ${lines.reduce((n, l) => n + l.ordered, 0)} units (recorded on screen)`).then(() => setPicks({}));
  };

  const markPacked = () => {
    const e: Record<string, string> = {};
    if (!/^[1-9]\d*$/.test(s.packages)) e.packages = "At least 1 package";
    if (!/^\d+(\.\d)?$/.test(s.weight) || Number(s.weight) <= 0) e.weight = "Enter the weight in kg";
    setErrors(e);
    if (Object.keys(e).length) return;
    void patch({ lines: lines.map((l) => ({ ...l, packed: l.picked })), stage: "packed", packages: Number(s.packages), weightKg: Number(s.weight) }, "Marked packed", `Packed into ${s.packages} package(s), ${s.weight} kg`);
  };

  const dispatch = () => {
    const e: Record<string, string> = {};
    if (!s.carrier) e.carrier = "Choose a carrier";
    if (s.carrier && s.carrier !== "Own fleet" && !/^[A-Za-z0-9-]{6,30}$/.test(s.tracking.trim())) e.tracking = "Enter a tracking number (6–30 letters/digits)";
    setErrors(e);
    if (Object.keys(e).length) return;
    confirm.ask({
      title: "Mark this order dispatched?",
      body: (
        <p>
          This records <span className="font-medium text-ink">{so.number}</span> as dispatched with {s.carrier}
          {s.tracking ? ` (${s.tracking.trim()})` : ""} in this prototype only. No shipment is booked with the carrier, the customer isn&apos;t notified, and stock isn&apos;t deducted.
        </p>
      ),
      confirmLabel: "Mark dispatched (simulated)",
      run: () => patch({ stage: "dispatched", carrier: s.carrier, tracking: s.tracking.trim() }, "Marked dispatched (simulated)", `Marked dispatched via ${s.carrier} (simulated — no shipment created)`),
    });
  };

  const setShipField = (k: keyof typeof s, v: string) => setShip({ ...s, [k]: v });

  return (
    <PageShell>
      <PageHeading
        crumbs={crumbs}
        title={
          <span className="flex flex-wrap items-center gap-3">
            Fulfilment · <span className="font-mono">{so.number}</span>
            <ToneBadge tone={FULFILMENT_STAGE[f.stage]} />
          </span>
        }
        description={
          <>
            <TextLink href={recordHref("customers", so.customerId)} className="font-normal">
              {customerLabel(customers, so.customerId)}
            </TextLink>{" "}
            · from {warehouseLabel(warehouses, so.warehouseId)} · deliver by {formatDate(so.deliveryDate)}
          </>
        }
        actions={
          <TextLink href={recordHref("salesOrders", so.id)} className="text-[13px] text-brand">
            View sales order
          </TextLink>
        }
      />
      <Card className="mt-5 px-5 py-4">
        <StatusSteps steps={FULFILMENT_FLOW} current={f.stage} labels={{ "to-pick": "To Pick", picking: "Picking", packed: "Packed", dispatched: "Dispatched (simulated)" }} />
      </Card>
      {f.historical && <PrototypeNote className="mt-4">Seeded demo history: this order&apos;s goods issue appears in Stock Movement History. The carrier and tracking number are sample values.</PrototypeNote>}

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            title="Pick list"
            subtitle={`${formatNumber(lines.reduce((n, l) => n + (Number.isNaN(l.picked) ? 0 : l.picked), 0))} of ${formatNumber(lines.reduce((n, l) => n + l.ordered, 0))} units picked`}
            action={
              canPick && (
                <>
                  <OutlineButton icon={HandGrabbingIcon} className="h-8" onClick={() => setPicks(Object.fromEntries(f.lines.map((l) => [l.productId, String(l.ordered)])))}>
                    Pick all
                  </OutlineButton>
                  <PrimaryButton className="h-8" onClick={savePicks} disabled={!Object.keys(picks).length}>
                    Save picks
                  </PrimaryButton>
                </>
              )
            }
          />
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[640px] border-collapse">
              <caption className="sr-only">Pick list for {so.number}</caption>
              <thead>
                <tr className="border-y border-line-soft bg-[#FAFAFB]">
                  <th scope="col" className={th}>
                    Product
                  </th>
                  <th scope="col" className={th}>
                    Bin
                  </th>
                  <th scope="col" className={cn(th, "text-right")}>
                    Ordered
                  </th>
                  <th scope="col" className={cn(th, "w-32 text-right")}>
                    Picked
                  </th>
                  <th scope="col" className={cn(th, "text-right")}>
                    Packed
                  </th>
                </tr>
              </thead>
              <tbody>
                {f.lines.map((l) => {
                  const p = byId.get(l.productId);
                  const raw = picks[l.productId] ?? String(l.picked);
                  return (
                    <tr key={l.productId} className="border-b border-line-soft last:border-0">
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
                      <td className={cn(td, "font-mono text-[12.5px]")}>{p ? binFor(p.id, p.category, p.costPrice, zones) : "—"}</td>
                      <td className={cn(td, "text-right tabular-nums")}>{formatNumber(l.ordered)}</td>
                      <td className={cn(td, "text-right")}>
                        {canPick ? (
                          <>
                            <input value={raw} onChange={(e) => setPicks({ ...picks, [l.productId]: e.target.value })} inputMode="numeric" aria-label={`Picked quantity for ${p?.name}`} aria-invalid={errors[l.productId] ? true : undefined} className={cn(fieldClass, "text-right tabular-nums")} />
                            {errors[l.productId] && <p className="mt-1 text-[11.5px] font-medium text-[#DC2626]">{errors[l.productId]}</p>}
                          </>
                        ) : (
                          <span className="tabular-nums">{formatNumber(l.picked)}</span>
                        )}
                      </td>
                      <td className={cn(td, "text-right tabular-nums")}>{formatNumber(l.packed)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Pack" subtitle={f.stage === "packed" || f.stage === "dispatched" ? `${f.packages} package(s) · ${f.weightKg} kg` : "Pick every line before packing"} />
            <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
              <FormField label="Packages" htmlFor="ful-packages" error={errors.packages}>
                <input id="ful-packages" value={s.packages} onChange={(e) => setShipField("packages", e.target.value)} disabled={!canPick} inputMode="numeric" className={fieldClass} aria-invalid={errors.packages ? true : undefined} />
              </FormField>
              <FormField label="Weight (kg)" htmlFor="ful-weight" error={errors.weight}>
                <input id="ful-weight" value={s.weight} onChange={(e) => setShipField("weight", e.target.value)} disabled={!canPick} inputMode="decimal" className={fieldClass} aria-invalid={errors.weight ? true : undefined} />
              </FormField>
              {canPick && (
                <PrimaryButton icon={PackageIcon} className="sm:col-span-2" disabled={!allPicked || Object.keys(picks).length > 0} onClick={markPacked}>
                  Mark packed
                </PrimaryButton>
              )}
              {canPick && (!allPicked || Object.keys(picks).length > 0) && <p className="text-[12px] leading-4 text-ink-muted sm:col-span-2">{Object.keys(picks).length ? "Save your picks first." : "All lines must be fully picked."}</p>}
            </div>
          </Card>
          <Card>
            <CardHeader title="Ship" subtitle="Shipment details are recorded here only" />
            <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
              <FormField label="Carrier" htmlFor="ful-carrier" error={errors.carrier}>
                <SelectField id="ful-carrier" value={s.carrier} onChange={(v) => setShipField("carrier", v)} options={CARRIERS.map((c) => ({ value: c, label: c }))} placeholder="Choose a carrier" invalid={!!errors.carrier} />
              </FormField>
              <FormField label="Tracking number" htmlFor="ful-tracking" error={errors.tracking} hint={s.carrier === "Own fleet" ? "Optional for own fleet" : undefined}>
                <input id="ful-tracking" value={s.tracking} onChange={(e) => setShipField("tracking", e.target.value)} disabled={f.stage === "dispatched"} className={cn(fieldClass, "font-mono")} aria-invalid={errors.tracking ? true : undefined} />
              </FormField>
              <UnavailableTip reason="Carrier integration isn't available in this prototype" className="sm:col-span-2">
                <OutlineButton icon={CubeIcon} disabled className="w-full">
                  Book shipment with carrier
                </OutlineButton>
              </UnavailableTip>
              {f.stage === "packed" && (
                <PrimaryButton icon={TruckIcon} className="sm:col-span-2" onClick={dispatch}>
                  Mark dispatched (simulated)
                </PrimaryButton>
              )}
              {f.stage === "dispatched" && (
                <p className="flex items-center gap-1.5 text-[12.5px] text-ink-body sm:col-span-2">
                  <CheckIcon size={14} aria-hidden className="text-[var(--success)]" /> Recorded as dispatched{f.historical ? " (demo history)" : " — simulated, no goods have shipped"}.
                </p>
              )}
            </div>
          </Card>
          <ActivityList items={f.activity} />
        </div>
      </div>
      {confirm.dialog}
    </PageShell>
  );
}

