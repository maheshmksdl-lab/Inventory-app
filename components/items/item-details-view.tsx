"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArchiveIcon,
  ArrowCounterClockwiseIcon,
  ArrowLeftIcon,
  ArrowsClockwiseIcon,
  CheckCircleIcon,
  CopyIcon,
  DotsThreeIcon,
  FlagIcon,
  ImageIcon,
  ImagesIcon,
  LockSimpleIcon,
  PackageIcon,
  PencilSimpleIcon,
  PlusCircleIcon,
  PlusIcon,
  StackIcon,
  StarIcon,
  StorefrontIcon,
  SwatchesIcon,
  TagIcon,
  TrashIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge, Card, CardHeader, FilterSelect, OutlineButton, PageShell, Pagination, PrimaryButton, StatusBadge, td, th, UnderlineTabs, Breadcrumbs } from "@/components/shared/inventory-ui";
import { KpiCard } from "@/components/shared/kpi-card";
import { MovementTable } from "@/components/shared/movement-table";
import { ProductThumb } from "@/components/shared/product-thumb";
import { EmptyState, ErrorState } from "@/components/shared/state-panels";
import { useItem, useItemMovements, useUpdateItemImages } from "@/hooks/use-inventory";
import { useHydrated } from "@/hooks/use-hydrated";
import { MAX_IMAGES, type ItemDetail } from "@/lib/api/inventory";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";
import { ITEM_TYPE_LABEL, LIFECYCLE_LABEL, MOVEMENT_META, STATUS_META, TRACKING_LABEL, VALUATION_LABEL } from "@/lib/inventory-meta";
import { vendorName, warehouseName, WAREHOUSES } from "@/lib/mock-data/warehouses";
import { getItemsListHref, itemCloneHref, itemEditHref, itemHref, itemVariantNewHref } from "@/lib/routes";
import type { ActivityKind, MovementType } from "@/lib/types/inventory";
import { cn } from "@/lib/utils";
import { ImageManager } from "./image-manager";
import { useArchiveFlow, useDeleteFlow } from "./item-actions";

export const ITEM_TABS = ["overview", "variants", "components", "stock", "transactions", "suppliers", "activity"] as const;
export type ItemTab = (typeof ITEM_TABS)[number];
const TAB_LABEL: Record<ItemTab, string> = {
  overview: "Overview",
  variants: "Variants",
  components: "Components",
  stock: "Stock by Warehouse",
  transactions: "Transactions",
  suppliers: "Suppliers",
  activity: "Activity",
};

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`, { description: text });
  } catch {
    toast.error(`Couldn't copy the ${label.toLowerCase()}`);
  }
}

// ── Overview ─────────────────────────────────────────────────────────

function Detail({ label, children, mono }: { label: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] leading-4 text-ink-muted">{label}</dt>
      <dd className={cn("mt-1 text-[13.5px] leading-5 break-words text-ink", mono && "font-mono text-[13px]")}>{children}</dd>
    </div>
  );
}

function DetailGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line-soft px-5 py-4 first:border-t-0 first:pt-0">
      <h3 className="mb-3 text-[12px] leading-4 font-semibold tracking-[0.04em] text-ink-muted uppercase">{title}</h3>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">{children}</dl>
    </section>
  );
}

const dash = (v: string | null | undefined) => v || "—";

/** Images: the primary large, the rest as thumbnails, with a button to manage them. */
function ImagesCard({ d, onManage }: { d: ItemDetail; onManage?: () => void }) {
  const p = d.item;
  const [shown, setShown] = useState(0);
  const current = Math.min(shown, Math.max(0, p.images.length - 1));
  return (
    <Card>
      <CardHeader
        title="Images"
        subtitle={p.images.length ? `${p.images.length} of ${MAX_IMAGES} · the first is the primary image` : "No images yet"}
        action={
          onManage && (
            <OutlineButton icon={p.images.length ? ImagesIcon : UploadSimpleIcon} className="h-8" onClick={onManage}>
              {p.images.length ? "Manage" : "Upload"}
            </OutlineButton>
          )
        }
      />
      <div className="px-5 pb-5">
        {p.images.length === 0 ? (
          <button
            type="button"
            onClick={onManage}
            disabled={!onManage}
            className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#D0D5DD] bg-[#FAFAFB] text-center transition-colors hover:border-brand-hover hover:bg-brand-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action disabled:pointer-events-none"
          >
            <ProductThumb icon={p.icon} size={56} className="rounded-xl" />
            <span className="text-[13px] font-medium text-ink">{onManage ? "Upload product images" : "No images"}</span>
            {onManage && <span className="text-[12px] text-ink-muted">JPG, PNG, WebP or GIF, up to 5 MB each</span>}
          </button>
        ) : (
          <>
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-line bg-[#F5F6F8]">
              <Image src={p.images[current]} alt={`${p.name}, image ${current + 1} of ${p.images.length}`} fill sizes="(min-width: 1280px) 420px, 90vw" className="object-contain" priority={current === 0} />
            </div>
            {p.images.length > 1 && (
              <ul className="mt-3 grid grid-cols-6 gap-2" aria-label="Choose an image">
                {p.images.map((src, i) => (
                  <li key={`${i}-${src.slice(-24)}`}>
                    <button
                      type="button"
                      onClick={() => setShown(i)}
                      aria-pressed={i === current}
                      aria-label={`Show image ${i + 1}${i === 0 ? " (primary)" : ""}`}
                      className={cn(
                        "relative block aspect-square w-full overflow-hidden rounded-lg border bg-[#F5F6F8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action",
                        i === current ? "border-brand ring-2 ring-brand-10" : "border-line-soft hover:border-[#D0D5DD]",
                      )}
                    >
                      <Image src={src} alt="" fill sizes="64px" className="object-cover" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

function OverviewTab({ d, onManageImages }: { d: ItemDetail; onManageImages?: () => void }) {
  const p = d.item;
  const service = p.type === "service";
  const margin = p.sellable && p.purchasable && p.sellingPrice > 0 ? ((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100 : null;
  const attrs = Object.entries(p.variantValues);
  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
      <div className="grid gap-4">
        <ImagesCard d={d} onManage={onManageImages} />
        <Card>
          <CardHeader title="Sales description" />
          <p className="px-5 pb-5 text-[13.5px] leading-[22px] whitespace-pre-line text-ink-body">{p.description || <span className="text-ink-muted">No description yet.</span>}</p>
        </Card>
      </div>
      <Card className="pt-4">
        <DetailGroup title="General">
          <Detail label="Item type">{ITEM_TYPE_LABEL[p.type]}</Detail>
          <Detail label="SKU" mono>
            {p.sku}
          </Detail>
          <Detail label="Unit">{p.unit}</Detail>
          <Detail label="Category">{p.category}</Detail>
          {!service && <Detail label="Brand">{dash(p.brand)}</Detail>}
          {!service && <Detail label="Manufacturer">{dash(p.manufacturer)}</Detail>}
          {!service && <Detail label="Returnable">{p.returnable ? "Yes" : "No"}</Detail>}
          <Detail label="Item status">{LIFECYCLE_LABEL[p.lifecycle]}</Detail>
          {attrs.map(([k, v]) => (
            <Detail key={k} label={k}>
              {v}
            </Detail>
          ))}
        </DetailGroup>

        <DetailGroup title="Sales information">
          {p.sellable ? (
            <>
              <Detail label="Selling price">{formatCurrency(p.sellingPrice, { decimals: true })}</Detail>
              <Detail label="Sales account">{dash(p.salesAccount)}</Detail>
              <Detail label="Margin">{margin === null ? "—" : `${margin.toFixed(1)}%`}</Detail>
            </>
          ) : (
            <Detail label="Sold">No</Detail>
          )}
        </DetailGroup>

        <DetailGroup title="Purchase information">
          {p.purchasable ? (
            <>
              <Detail label="Cost price">{formatCurrency(p.costPrice, { decimals: true })}</Detail>
              <Detail label="Purchase account">{dash(p.purchaseAccount)}</Detail>
              <Detail label="Preferred vendor">{p.preferredVendorId ? vendorName(p.preferredVendorId) : "—"}</Detail>
              {p.purchaseDescription && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <Detail label="Purchase description">{p.purchaseDescription}</Detail>
                </div>
              )}
            </>
          ) : (
            <Detail label="Bought">No</Detail>
          )}
        </DetailGroup>

        <DetailGroup title="Tax">
          <Detail label="Tax rate">{p.taxClass}</Detail>
          <Detail label={service ? "SAC code" : "HSN code"} mono>
            {dash(p.hsnCode)}
          </Detail>
        </DetailGroup>

        {p.trackInventory ? (
          <DetailGroup title="Inventory">
            <Detail label="Inventory account">{dash(p.inventoryAccount)}</Detail>
            <Detail label="Valuation method">{VALUATION_LABEL[p.valuationMethod]}</Detail>
            <Detail label="Advanced tracking">{TRACKING_LABEL[p.tracking]}</Detail>
            <Detail label="Reorder point">
              {formatNumber(p.reorderPoint)} {p.unit}
            </Detail>
            <Detail label="Stock value (at cost)">{formatCurrency(p.stockValue)}</Detail>
          </DetailGroup>
        ) : (
          <DetailGroup title="Inventory">
            <Detail label="Inventory tracking">{service ? "Not tracked (service)" : "Not tracked"}</Detail>
          </DetailGroup>
        )}

        {!service && (
          <DetailGroup title="Fulfilment">
            <Detail label="Dimensions">{p.dimensions ? `${p.dimensions.length} × ${p.dimensions.width} × ${p.dimensions.height} ${p.dimensions.unit}` : "—"}</Detail>
            <Detail label="Weight">{p.weight ? `${p.weight.value} ${p.weight.unit}` : "—"}</Detail>
            <Detail label="UPC / EAN" mono>
              {dash(p.barcode)}
            </Detail>
            <Detail label="MPN" mono>
              {dash(p.mpn)}
            </Detail>
            <Detail label="ISBN" mono>
              {dash(p.isbn)}
            </Detail>
          </DetailGroup>
        )}

        <DetailGroup title="Record">
          <Detail label="Created">{formatDateTime(p.createdAt)}</Detail>
          <Detail label="Last updated">{formatDateTime(p.updatedAt)}</Detail>
          {d.usedIn.length > 0 && (
            <Detail label="Component of">
              {d.usedIn.map((u, i) => (
                <span key={u.id}>
                  {i > 0 && ", "}
                  <Link href={itemHref(u.id)} className="rounded font-medium text-ink underline decoration-line underline-offset-2 hover:text-brand focus-visible:outline-2 focus-visible:outline-brand-action">
                    {u.name}
                  </Link>
                </span>
              ))}
            </Detail>
          )}
        </DetailGroup>
      </Card>
    </div>
  );
}

// ── Variants ─────────────────────────────────────────────────────────

function VariantsTab({ d }: { d: ItemDetail }) {
  const router = useRouter();
  const headId = d.item.parentId ?? d.item.id;
  const head = d.family.find((f) => f.id === headId);
  return (
    <Card>
      <CardHeader
        title="Variants"
        subtitle={`${d.familyAttributes.map((a) => `${a.name}: ${a.options.join(", ")}`).join(" · ")}`}
        action={
          head?.lifecycle !== "archived" && (
            <OutlineButton icon={PlusIcon} className="h-8" onClick={() => router.push(itemVariantNewHref(headId))}>
              Add variant
            </OutlineButton>
          )
        }
      />
      <div className="relative overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[720px] border-collapse">
          <caption className="sr-only">Variants of {head?.name}</caption>
          <thead>
            <tr className="border-y border-line-soft bg-[#FAFAFB]">
              <th scope="col" className={th}>
                Item
              </th>
              {d.familyAttributes.map((a) => (
                <th key={a.name} scope="col" className={th}>
                  {a.name}
                </th>
              ))}
              <th scope="col" className={cn(th, "text-right")}>
                Selling price
              </th>
              <th scope="col" className={cn(th, "text-right")}>
                Available
              </th>
              <th scope="col" className={th}>
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {d.family.map((f) => (
              <tr key={f.id} className={cn("border-b border-line-soft last:border-0", f.id === d.item.id && "bg-brand-surface")}>
                <td className={td}>
                  <span className="flex min-w-0 items-center gap-3">
                    <ProductThumb icon={f.icon} src={f.image} size={32} />
                    <span className="min-w-0">
                      <Link href={itemHref(f.id)} className="block truncate rounded font-semibold text-ink hover:text-brand focus-visible:outline-2 focus-visible:outline-brand-action" aria-current={f.id === d.item.id ? "page" : undefined}>
                        {f.name}
                      </Link>
                      <span className="block font-mono text-[12px] leading-4 text-ink-muted">
                        {f.sku}
                        {f.id === headId && <span className="ml-1.5 font-sans">· Parent</span>}
                      </span>
                    </span>
                  </span>
                </td>
                {d.familyAttributes.map((a) => (
                  <td key={a.name} className={td}>
                    {f.variantValues[a.name] ?? "—"}
                  </td>
                ))}
                <td className={cn(td, "text-right tabular-nums")}>{formatCurrency(f.sellingPrice)}</td>
                <td className={cn(td, "text-right font-semibold text-ink tabular-nums")}>{f.trackInventory ? formatNumber(f.available) : "—"}</td>
                <td className={td}>
                  <StatusBadge status={f.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── Components (composite items) ─────────────────────────────────────

function ComponentsTab({ d }: { d: ItemDetail }) {
  const total = d.components.reduce((s, c) => s + c.costPrice * c.quantity, 0);
  // How many complete units the components in stock could make.
  const tracked = d.components.filter((c) => c.trackInventory);
  const buildable = tracked.length ? Math.max(0, Math.min(...tracked.map((c) => Math.floor(c.available / c.quantity)))) : null;
  return (
    <Card>
      <CardHeader title="Components" subtitle={`What one ${d.item.unit} of ${d.item.name} is made of`} />
      {d.components.length === 0 ? (
        <EmptyState icon={StackIcon} title="No components" hint="Edit the item to add the items it's assembled from." />
      ) : (
        <div className="relative overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[640px] border-collapse">
            <caption className="sr-only">Components of {d.item.name}</caption>
            <thead>
              <tr className="border-y border-line-soft bg-[#FAFAFB]">
                <th scope="col" className={th}>
                  Item
                </th>
                <th scope="col" className={cn(th, "text-right")}>
                  Quantity
                </th>
                <th scope="col" className={cn(th, "text-right")}>
                  Cost price
                </th>
                <th scope="col" className={cn(th, "text-right")}>
                  Line cost
                </th>
                <th scope="col" className={cn(th, "text-right")}>
                  Available
                </th>
              </tr>
            </thead>
            <tbody>
              {d.components.map((c) => (
                <tr key={c.id} className="border-b border-line-soft">
                  <td className={td}>
                    <span className="flex min-w-0 items-center gap-3">
                      <ProductThumb icon={c.icon} src={c.image} size={32} />
                      <span className="min-w-0">
                        <Link href={itemHref(c.id)} className="block truncate rounded font-semibold text-ink hover:text-brand focus-visible:outline-2 focus-visible:outline-brand-action">
                          {c.name}
                        </Link>
                        <span className="block font-mono text-[12px] leading-4 text-ink-muted">{c.sku}</span>
                      </span>
                    </span>
                  </td>
                  <td className={cn(td, "text-right tabular-nums")}>
                    {formatNumber(c.quantity)} {c.unit}
                  </td>
                  <td className={cn(td, "text-right tabular-nums")}>{formatCurrency(c.costPrice, { decimals: true })}</td>
                  <td className={cn(td, "text-right font-medium text-ink tabular-nums")}>{formatCurrency(c.costPrice * c.quantity, { decimals: true })}</td>
                  <td className={cn(td, "text-right tabular-nums")}>{c.trackInventory ? formatNumber(c.available) : "—"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#FAFAFB]">
                <th scope="row" colSpan={3} className={cn(td, "text-left font-semibold text-ink")}>
                  Component cost per unit
                </th>
                <td className={cn(td, "text-right font-semibold text-ink tabular-nums")}>{formatCurrency(total, { decimals: true })}</td>
                <td className={td} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      {buildable !== null && (
        <p className="px-5 pt-2 pb-4 text-[12px] leading-4 text-ink-muted">
          Components in stock are enough to assemble <span className="font-semibold text-ink">{formatNumber(buildable)}</span> more {d.item.unit}. Assembly isn&apos;t recorded in this prototype.
        </p>
      )}
    </Card>
  );
}

// ── Manage images ────────────────────────────────────────────────────

/** Edit an item's images in place and save them straight away (no full edit form). */
function ManageImagesDialog({ d, open, onOpenChange }: { d: ItemDetail; open: boolean; onOpenChange: (o: boolean) => void }) {
  const p = d.item;
  const [draft, setDraft] = useState(p.images);
  const save = useUpdateItemImages(p.id);
  const changed = JSON.stringify(draft) !== JSON.stringify(p.images);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setDraft(p.images);
        onOpenChange(o);
      }}
    >
      <DialogContent className="flex max-h-[min(760px,calc(100dvh-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <div className="border-b border-line-soft px-5 pt-5 pb-4">
          <DialogTitle className="pr-8 text-[17px] font-semibold text-ink">Images of {p.name}</DialogTitle>
          <DialogDescription className="mt-1 text-[13px] leading-5 text-ink-muted">Upload, rotate, replace or remove images and choose the primary one. The primary image shows in lists and documents.</DialogDescription>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">
          <ImageManager images={draft} onChange={setDraft} name={p.name} />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line-soft bg-[#FAFAFB] px-5 py-3">
          <p className="mr-auto text-[12px] leading-4 text-ink-muted">Saved in this browser tab only.</p>
          <OutlineButton
            onClick={() => {
              setDraft(p.images);
              onOpenChange(false);
            }}
          >
            Cancel
          </OutlineButton>
          <PrimaryButton
            disabled={!changed || save.isPending}
            onClick={async () => {
              const before = p.images;
              // mutateAsync, not mutate(…, callbacks): the save refreshes the item, which remounts
              // this dialog, and per-call mutate callbacks don't run after an unmount.
              try {
                await save.mutateAsync(draft);
                onOpenChange(false);
                toast.success("Images saved", {
                  description: `${p.name} · ${draft.length === 1 ? "1 image" : `${draft.length} images`}`,
                  action: { label: "Undo", onClick: () => void save.mutateAsync(before) },
                });
              } catch (e) {
                toast.error("Couldn't save the images", { description: e instanceof Error ? e.message : undefined });
              }
            }}
          >
            {save.isPending ? "Saving…" : "Save images"}
          </PrimaryButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Stock by warehouse ───────────────────────────────────────────────

function StockTab({ d }: { d: ItemDetail }) {
  const t = d.warehouses.reduce((s, w) => ({ onHand: s.onHand + w.onHand, reserved: s.reserved + w.reserved, available: s.available + w.available, reorderPoint: s.reorderPoint + w.reorderPoint }), {
    onHand: 0,
    reserved: 0,
    available: 0,
    reorderPoint: 0,
  });
  const inactive = d.item.lifecycle !== "active";
  return (
    <Card>
      <CardHeader title="Stock by Warehouse" subtitle="Available = On hand − Reserved" />
      <div className="relative overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[640px] border-collapse">
          <caption className="sr-only">Stock of {d.item.name} by warehouse</caption>
          <thead>
            <tr className="border-y border-line-soft bg-[#FAFAFB]">
              <th scope="col" className={th}>
                Warehouse
              </th>
              <th scope="col" className={cn(th, "text-right")}>
                On hand
              </th>
              <th scope="col" className={cn(th, "text-right")}>
                Reserved
              </th>
              <th scope="col" className={cn(th, "text-right")}>
                Available
              </th>
              <th scope="col" className={cn(th, "text-right")}>
                Reorder point
              </th>
              <th scope="col" className={th}>
                Stock status
              </th>
            </tr>
          </thead>
          <tbody>
            {d.warehouses.map((w) => (
              <tr key={w.warehouseId} className="border-b border-line-soft">
                <th scope="row" className={cn(td, "text-left font-normal")}>
                  <span className="block font-medium text-ink">{warehouseName(w.warehouseId)}</span>
                  <span className="block text-[12px] leading-4 text-ink-muted">{WAREHOUSES.find((x) => x.id === w.warehouseId)?.city}</span>
                </th>
                <td className={cn(td, "text-right tabular-nums")}>{formatNumber(w.onHand)}</td>
                <td className={cn(td, "text-right tabular-nums")}>{formatNumber(w.reserved)}</td>
                <td className={cn(td, "text-right font-semibold text-ink tabular-nums")}>{formatNumber(w.available)}</td>
                <td className={cn(td, "text-right tabular-nums")}>{formatNumber(w.reorderPoint)}</td>
                <td className={td}>{inactive ? <span className="text-[12.5px] text-ink-muted">Not tracked ({LIFECYCLE_LABEL[d.item.lifecycle].toLowerCase()})</span> : <StatusBadge status={w.status} />}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#FAFAFB]">
              <th scope="row" className={cn(td, "text-left font-semibold text-ink")}>
                All warehouses
              </th>
              <td className={cn(td, "text-right font-semibold text-ink tabular-nums")}>{formatNumber(t.onHand)}</td>
              <td className={cn(td, "text-right font-semibold text-ink tabular-nums")}>{formatNumber(t.reserved)}</td>
              <td className={cn(td, "text-right font-semibold text-ink tabular-nums")}>{formatNumber(t.available)}</td>
              <td className={cn(td, "text-right text-ink-body tabular-nums")} title="Sum of warehouse reorder points">
                {formatNumber(t.reorderPoint)}
              </td>
              <td className={td}>{inactive ? null : <StatusBadge status={d.item.stockStatus} />}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="px-5 pt-2 pb-4 text-[12px] leading-4 text-ink-muted">
        Overall status compares total available stock with the item-level reorder point ({formatNumber(d.item.reorderPoint)}).
      </p>
    </Card>
  );
}

// ── Transactions ─────────────────────────────────────────────────────

const TX_PAGE = 10;

function TransactionsTab({ id }: { id: string }) {
  const { data, isError, refetch } = useItemMovements(id);
  const [type, setType] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [page, setPage] = useState(1);
  const rows = useMemo(() => (data ?? []).filter((m) => (!type || m.type === type) && (!warehouse || m.from === warehouse || m.to === warehouse)), [data, type, warehouse]);
  const pageCount = Math.max(1, Math.ceil(rows.length / TX_PAGE));
  const current = Math.min(page, pageCount);

  return (
    <Card>
      <CardHeader title="Transactions" subtitle="Stock movements for this item · sample ledger" />
      <div className="grid grid-cols-1 gap-2 px-5 pb-3 sm:flex">
        <FilterSelect
          label="Transaction type"
          allLabel="All transaction types"
          value={type}
          onChange={(v) => {
            setType(v);
            setPage(1);
          }}
          options={(Object.keys(MOVEMENT_META) as MovementType[]).map((k) => ({ value: k, label: MOVEMENT_META[k].label }))}
          className="sm:w-[210px]"
        />
        <FilterSelect
          label="Warehouse"
          allLabel="All warehouses"
          value={warehouse}
          onChange={(v) => {
            setWarehouse(v);
            setPage(1);
          }}
          options={WAREHOUSES.map((w) => ({ value: w.id, label: w.name }))}
          className="sm:w-[190px]"
        />
      </div>
      {isError ? (
        <ErrorState action={<OutlineButton onClick={() => refetch()}>Try again</OutlineButton>} />
      ) : !data ? (
        <div className="space-y-3 px-5 pb-5">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ArrowsClockwiseIcon}
          title={data.length === 0 ? "No transactions yet" : "No transactions match"}
          hint={data.length === 0 ? "Stock movements appear here once the item is received, issued, transferred or adjusted." : "Try another type or warehouse."}
        />
      ) : (
        <>
          <MovementTable rows={rows.slice((current - 1) * TX_PAGE, current * TX_PAGE)} caption="Item transactions" />
          <div className="border-t border-line-soft px-5 py-3">
            <Pagination page={current} pageCount={pageCount} total={rows.length} pageSize={TX_PAGE} noun="transactions" onPage={setPage} />
          </div>
        </>
      )}
    </Card>
  );
}

// ── Suppliers ────────────────────────────────────────────────────────

function SuppliersTab({ d }: { d: ItemDetail }) {
  const list = d.item.suppliers;
  return (
    <Card>
      <CardHeader title="Suppliers" subtitle="Vendors this item is bought from" />
      {list.length === 0 ? (
        <EmptyState icon={StorefrontIcon} title="No suppliers linked" hint="Vendors list the items they supply on their Products tab." />
      ) : (
        <div className="relative overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[560px] border-collapse">
            <caption className="sr-only">Suppliers of {d.item.name}</caption>
            <thead>
              <tr className="border-y border-line-soft bg-[#FAFAFB]">
                <th scope="col" className={th}>
                  Supplier
                </th>
                <th scope="col" className={th}>
                  Supplier SKU
                </th>
                <th scope="col" className={cn(th, "text-right")}>
                  Last purchase cost
                </th>
                <th scope="col" className={th}>
                  Preferred
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.vendorId} className="border-b border-line-soft last:border-0">
                  <td className={cn(td, "font-medium text-ink")}>{vendorName(s.vendorId)}</td>
                  <td className={cn(td, "font-mono text-[12px]")}>{s.supplierSku}</td>
                  <td className={cn(td, "text-right tabular-nums")}>{formatCurrency(s.lastCost, { decimals: true })}</td>
                  <td className={td}>
                    {s.preferred ? (
                      <Badge fg="var(--inventory-depth)" bg="var(--inventory-surface)">
                        <StarIcon size={12} weight="fill" aria-hidden /> Preferred
                      </Badge>
                    ) : (
                      <span className="text-ink-muted">—</span>
                    )}
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

// ── Activity ─────────────────────────────────────────────────────────

const ACTIVITY_ICON: Record<ActivityKind, Icon> = {
  created: PlusCircleIcon,
  updated: PencilSimpleIcon,
  price: TagIcon,
  archived: ArchiveIcon,
  restored: ArrowCounterClockwiseIcon,
  status: FlagIcon,
  images: ImageIcon,
  variant: SwatchesIcon,
};

function ActivityTab({ d }: { d: ItemDetail }) {
  return (
    <Card>
      <CardHeader title="Activity" subtitle="Changes to this item, newest first" />
      <ol className="px-5 pb-5">
        {d.item.activity.map((a, i) => {
          const IconCmp = ACTIVITY_ICON[a.kind];
          const last = i === d.item.activity.length - 1;
          return (
            <li key={a.id} className="relative flex gap-3 pb-5 last:pb-0">
              {!last && <span className="absolute top-8 bottom-0 left-[15px] w-px bg-line" aria-hidden />}
              <span className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-white text-ink-muted" aria-hidden>
                <IconCmp size={15} />
              </span>
              <div className="min-w-0 pt-1">
                <p className="text-[13.5px] leading-5 text-ink">{a.text}</p>
                <p className="mt-0.5 text-[12px] leading-4 text-ink-muted">
                  {a.user} · {formatDateTime(a.at)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading item">
      <div className="mt-4 flex items-center gap-4">
        <Skeleton className="size-16 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[88px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="mt-6 h-64 rounded-xl" />
    </div>
  );
}

export function ItemDetailsView({ id, initialTab }: { id: string; initialTab?: string }) {
  const hydrated = useHydrated();
  const { data: fetched, isError, error, refetch } = useItem(id);
  const data = hydrated ? fetched : undefined;
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTabState] = useState<ItemTab>((ITEM_TABS as readonly string[]).includes(initialTab ?? "") ? (initialTab as ItemTab) : "overview");
  const archive = useArchiveFlow();
  const listHref = getItemsListHref();
  const remove = useDeleteFlow((ids, label) => archive.ask(ids, label));
  const [managingImages, setManagingImages] = useState(false);

  const setTab = useCallback(
    (t: ItemTab) => {
      setTabState(t);
      router.replace(t === "overview" ? pathname : `${pathname}?tab=${t}`, { scroll: false });
    },
    [router, pathname],
  );

  const crumbs = [{ label: "Inventory" }, { label: "Items & Products", href: listHref }, { label: data?.item.name ?? "Item" }];

  if (isError) {
    const missing = error?.message === "Item not found";
    return (
      <PageShell>
        <Breadcrumbs items={crumbs.slice(0, 2).concat({ label: missing ? "Not found" : "Error" })} />
        <Card className="mt-4">
          {missing ? (
            <EmptyState
              icon={PackageIcon}
              title="This item doesn't exist"
              hint="It may have been created in an earlier session — demo data resets when the page reloads."
              action={
                <Link href={listHref} className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-white px-3.5 text-button-sm text-ink-body hover:bg-[#F9FAFB]">
                  <ArrowLeftIcon size={15} aria-hidden /> Back to Items
                </Link>
              }
            />
          ) : (
            <ErrorState action={<OutlineButton onClick={() => refetch()}>Try again</OutlineButton>} />
          )}
        </Card>
      </PageShell>
    );
  }

  const p = data?.item;
  const archived = p?.lifecycle === "archived";
  // Tabs that apply to this item: variants for families, components for composites, stock for tracked items.
  const tabs = ITEM_TABS.filter((t) => {
    if (!data || !p) return t === "overview";
    if (t === "variants") return data.family.length > 0;
    if (t === "components") return p.type === "composite";
    if (t === "stock" || t === "transactions") return p.trackInventory;
    if (t === "suppliers") return p.purchasable || p.suppliers.length > 0;
    return true;
  });
  const activeTab = tabs.includes(tab) ? tab : "overview";
  const canHaveVariants = p?.type === "goods" && !p.parentId && !archived;

  return (
    <PageShell>
      <Breadcrumbs items={crumbs} />
      {!p || !data ? (
        <DetailSkeleton />
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-start gap-x-4 gap-y-4">
            {archived ? (
              <ProductThumb icon={p.icon} src={p.image} size={64} className="rounded-xl" />
            ) : (
              <button
                type="button"
                onClick={() => setManagingImages(true)}
                aria-label={p.images.length ? "Manage images" : "Upload images"}
                title={p.images.length ? "Manage images" : "Upload images"}
                className="group/thumb relative shrink-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action"
              >
                <ProductThumb icon={p.icon} src={p.image} size={64} className="rounded-xl" />
                <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-[rgb(16_24_40/0.45)] text-white opacity-0 transition-opacity group-hover/thumb:opacity-100 group-focus-visible/thumb:opacity-100" aria-hidden>
                  {p.images.length ? <ImagesIcon size={20} /> : <UploadSimpleIcon size={20} />}
                </span>
              </button>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <h1 className="min-w-0 text-[22px] leading-8 font-semibold tracking-[-0.01em] break-words text-ink sm:text-[24px]">{p.name}</h1>
                <StatusBadge status={p.status} />
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] leading-5 text-ink-muted">
                <span className="font-mono text-ink-body">{p.sku}</span>
                <span aria-hidden>·</span>
                <span>{ITEM_TYPE_LABEL[p.type]}</span>
                <span aria-hidden>·</span>
                <span>{p.category}</span>
                {p.brand && (
                  <>
                    <span aria-hidden>·</span>
                    <span>{p.brand}</span>
                  </>
                )}
              </p>
              {data.parent && (
                <p className="mt-1 text-[12.5px] leading-5 text-ink-muted">
                  Variant of{" "}
                  <Link href={itemHref(data.parent.id)} className="rounded font-medium text-ink underline decoration-line underline-offset-2 hover:text-brand focus-visible:outline-2 focus-visible:outline-brand-action">
                    {data.parent.name}
                  </Link>
                  {Object.keys(p.variantValues).length > 0 &&
                    ` · ${Object.entries(p.variantValues)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(", ")}`}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={listHref}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-white px-3.5 text-button-sm text-ink-body transition-colors hover:border-[#D0D5DD] hover:bg-[#F9FAFB] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action"
              >
                <ArrowLeftIcon size={15} aria-hidden /> Back to Items
              </Link>
              {!archived && (
                <PrimaryButton icon={PencilSimpleIcon} onClick={() => router.push(itemEditHref(p.id))}>
                  Edit Item
                </PrimaryButton>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <OutlineButton aria-label="More actions" className="w-9 px-0">
                    <DotsThreeIcon size={18} weight="bold" aria-hidden />
                  </OutlineButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-xl">
                  <DropdownMenuItem onSelect={() => router.push(itemCloneHref(p.id))}>
                    <CopyIcon aria-hidden /> Clone item
                  </DropdownMenuItem>
                  {canHaveVariants && (
                    <DropdownMenuItem onSelect={() => router.push(p.attributes.length ? itemVariantNewHref(p.id) : itemEditHref(p.id))}>
                      <SwatchesIcon aria-hidden /> {p.attributes.length ? "Add variant" : "Set up variants"}
                    </DropdownMenuItem>
                  )}
                  {!archived && (
                    <DropdownMenuItem onSelect={() => setManagingImages(true)}>
                      <ImagesIcon aria-hidden /> {p.images.length ? "Manage images" : "Upload images"}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => copy(p.sku, "SKU")}>
                    <CopyIcon aria-hidden /> Copy SKU
                  </DropdownMenuItem>
                  {p.barcode && (
                    <DropdownMenuItem onSelect={() => copy(p.barcode, "Barcode")}>
                      <CopyIcon aria-hidden /> Copy barcode
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {archived ? (
                    <DropdownMenuItem onSelect={() => archive.restore([p.id], p.name)}>
                      <ArrowCounterClockwiseIcon aria-hidden /> Restore item
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onSelect={() => archive.ask([p.id], p.name)}>
                      <ArchiveIcon aria-hidden /> Archive item
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem variant="destructive" onSelect={() => remove.ask([p.id], p.name)}>
                    <TrashIcon aria-hidden /> Delete item
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {archived && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-[#F9FAFB] px-4 py-3 text-[13px] text-ink-body" role="status">
              <LockSimpleIcon size={17} aria-hidden className="text-ink-muted" />
              <span className="flex-1">This item is archived. It&apos;s hidden from lists and totals, and can&apos;t be edited until it&apos;s restored.</span>
              <OutlineButton icon={ArrowCounterClockwiseIcon} className="h-8" onClick={() => archive.restore([p.id], p.name)} disabled={archive.pending}>
                Restore
              </OutlineButton>
            </div>
          )}

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {p.trackInventory ? (
              <>
                <KpiCard icon={StackIcon} tone="neutral" label="Stock on Hand" value={`${formatNumber(p.onHand)} ${p.unit}`} note={`Across ${WAREHOUSES.length} warehouses`} />
                <KpiCard icon={LockSimpleIcon} tone="neutral" label="Reserved" value={formatNumber(p.reserved)} note="Allocated to open orders" />
                <KpiCard icon={CheckCircleIcon} tone="brand" label="Available" value={formatNumber(p.available)} note={p.lifecycle === "active" ? STATUS_META[p.stockStatus].label : LIFECYCLE_LABEL[p.lifecycle]} />
                <KpiCard icon={FlagIcon} tone="coral" label="Reorder Point" value={formatNumber(p.reorderPoint)} note="Item-level threshold" />
              </>
            ) : (
              <>
                <KpiCard icon={TagIcon} tone="brand" label="Selling Price" value={p.sellable ? formatCurrency(p.sellingPrice) : "—"} note={p.sellable ? `Per ${p.unit}` : "Not sold"} />
                <KpiCard icon={StorefrontIcon} tone="neutral" label="Cost Price" value={p.purchasable ? formatCurrency(p.costPrice) : "—"} note={p.purchasable ? `Per ${p.unit}` : "Not bought"} />
                <KpiCard icon={FlagIcon} tone="neutral" label="Tax Rate" value={p.taxClass} note={p.hsnCode ? `${p.type === "service" ? "SAC" : "HSN"} ${p.hsnCode}` : "No code set"} />
                <KpiCard icon={LockSimpleIcon} tone="coral" label="Inventory" value="Not tracked" note={p.type === "service" ? "Services have no stock" : "Tracking is off"} />
              </>
            )}
          </div>

          <UnderlineTabs
            label="Item information"
            idPrefix="item"
            className="mt-6"
            value={activeTab}
            onChange={setTab}
            tabs={tabs.map((t) => ({ value: t, label: TAB_LABEL[t], count: t === "variants" ? data.family.length : t === "components" ? data.components.length : undefined }))}
          />
          <div role="tabpanel" id={`item-panel-${activeTab}`} aria-labelledby={`item-tab-${activeTab}`} className="mt-4" tabIndex={-1}>
            {activeTab === "overview" && <OverviewTab d={data} onManageImages={archived ? undefined : () => setManagingImages(true)} />}
            {activeTab === "variants" && <VariantsTab d={data} />}
            {activeTab === "components" && <ComponentsTab d={data} />}
            {activeTab === "stock" && <StockTab d={data} />}
            {activeTab === "transactions" && <TransactionsTab id={p.id} />}
            {activeTab === "suppliers" && <SuppliersTab d={data} />}
            {activeTab === "activity" && <ActivityTab d={data} />}
          </div>
          {!archived && <ManageImagesDialog key={p.updatedAt} d={data} open={managingImages} onOpenChange={setManagingImages} />}
        </>
      )}
      {archive.dialog()}
      {remove.dialog(() => router.push(listHref))}
    </PageShell>
  );
}
