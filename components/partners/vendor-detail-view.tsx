"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArchiveIcon, ArrowCounterClockwiseIcon, CoinsIcon, PencilSimpleIcon, PlusIcon, ReceiptIcon, ShoppingCartIcon, StarIcon, StorefrontIcon } from "@phosphor-icons/react/dist/ssr";
import { poColumns, poTotal } from "@/components/purchasing/po-columns";
import { DataTable } from "@/components/shared/data-table";
import { Detail, DetailGrid, DetailSkeleton, MissingRecord, PrimaryLink, StatRow, StatTile, TextLink } from "@/components/shared/doc-ui";
import { Card, CardHeader, OutlineButton, PageHeading, PageShell, td, th, ToneBadge, UnderlineTabs } from "@/components/shared/inventory-ui";
import { ProductThumb } from "@/components/shared/product-thumb";
import { EmptyState } from "@/components/shared/state-panels";
import { useProducts, useRecord, useRecords } from "@/hooks/use-operations";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { RECORD_STATUS } from "@/lib/operations-meta";
import { itemHref, newHref, recordHref, ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { VendorFormDialog } from "./partner-forms";
import { useVendorArchive } from "./vendors-view";

type Tab = "overview" | "products" | "history";

export function VendorDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { data: v, isError } = useRecord("vendors", id);
  const { data: pos } = useRecords("purchaseOrders");
  const { data: bills } = useRecords("supplierBills");
  const { data: warehouses } = useRecords("warehouses");
  const { data: products } = useProducts();
  const archive = useVendorArchive();
  const [tab, setTab] = useState<Tab>("overview");
  const [editing, setEditing] = useState(false);
  const crumbs = [{ label: "Purchasing" }, { label: "Vendors", href: ROUTES.vendors }, { label: v?.name ?? "Vendor" }];

  const orders = useMemo(() => pos?.filter((p) => p.vendorId === id), [pos, id]);
  const supplied = useMemo(() => products?.filter((p) => p.lifecycle !== "archived" && p.suppliers.some((s) => s.vendorId === id)), [products, id]);

  if (isError) return <MissingRecord crumbs={crumbs} noun="vendor" backHref={ROUTES.vendors} backLabel="Back to Vendors" />;
  if (!v || !orders || !supplied) return <DetailSkeleton crumbs={crumbs} />;

  const live = orders.filter((p) => p.status !== "cancelled" && p.status !== "draft");
  const open = orders.filter((p) => ["pending-approval", "confirmed", "partially-received"].includes(p.status));
  const outstanding = (bills ?? []).filter((b) => b.vendorId === id && (b.status === "due" || b.status === "overdue" || b.status === "awaiting-review"));
  const last = live.reduce<string | null>((m, p) => (!m || p.orderDate > m ? p.orderDate : m), null);

  return (
    <PageShell>
      <PageHeading
        crumbs={crumbs}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {v.name} <ToneBadge tone={RECORD_STATUS[v.status]} />
          </span>
        }
        description={
          <>
            <span className="font-mono">{v.code}</span> · {v.city} · {v.paymentTerms}
          </>
        }
        actions={
          v.status === "active" ? (
            <>
              <OutlineButton icon={ArchiveIcon} onClick={() => archive.ask(v)}>
                Archive
              </OutlineButton>
              <OutlineButton icon={PencilSimpleIcon} onClick={() => setEditing(true)}>
                Edit
              </OutlineButton>
              <PrimaryLink href={newHref("purchaseOrders", { vendor: v.id })} icon={PlusIcon}>
                New Purchase Order
              </PrimaryLink>
            </>
          ) : (
            <OutlineButton icon={ArrowCounterClockwiseIcon} onClick={() => archive.restore(v)}>
              Restore vendor
            </OutlineButton>
          )
        }
      />
      <StatRow>
        <StatTile label="Products supplied" value={formatNumber(supplied.length)} icon={StorefrontIcon} tone="brand" />
        <StatTile label="Open purchase orders" value={formatNumber(open.length)} note={formatCurrency(open.reduce((s, p) => s + poTotal(p), 0))} icon={ShoppingCartIcon} />
        <StatTile label="Purchased (completed POs)" value={formatCurrency(orders.filter((p) => p.status === "completed").reduce((s, p) => s + poTotal(p), 0))} icon={CoinsIcon} />
        <StatTile label="Unpaid bills (demo)" value={formatNumber(outstanding.length)} note={formatCurrency(outstanding.reduce((s, b) => s + b.amount, 0))} icon={ReceiptIcon} tone="coral" />
      </StatRow>

      <Card className="mt-4">
        <UnderlineTabs
          idPrefix="vendor"
          label="Vendor sections"
          value={tab}
          onChange={setTab}
          className="px-5 pt-3"
          tabs={[
            { value: "overview", label: "Overview" },
            { value: "products", label: "Products", count: supplied.length },
            { value: "history", label: "Purchase History", count: orders.length },
          ]}
        />
        {tab === "overview" && (
          <div id="vendor-panel-overview" role="tabpanel" aria-labelledby="vendor-tab-overview">
            <CardHeader title="Vendor details" />
            <DetailGrid>
              <Detail label="Vendor name">{v.name}</Detail>
              <Detail label="Vendor code" mono>
                {v.code}
              </Detail>
              <Detail label="Status">{RECORD_STATUS[v.status].label}</Detail>
              <Detail label="Contact person">{v.contactName}</Detail>
              <Detail label="Email">
                <a href={`mailto:${v.email}`} className="rounded hover:text-brand focus-visible:outline-2 focus-visible:outline-brand-action">
                  {v.email}
                </a>
              </Detail>
              <Detail label="Phone">{v.phone}</Detail>
              <Detail label="Address" className="sm:col-span-2">
                {v.address}, {v.city}
              </Detail>
              <Detail label="GSTIN" mono>
                {v.gstin || "—"}
              </Detail>
              <Detail label="Payment terms">{v.paymentTerms}</Detail>
              <Detail label="Last purchase">{last ? formatDate(last) : "—"}</Detail>
              <Detail label="Vendor since">{formatDate(v.createdAt)}</Detail>
            </DetailGrid>
          </div>
        )}
        {tab === "products" && (
          <div id="vendor-panel-products" role="tabpanel" aria-labelledby="vendor-tab-products">
            {supplied.length === 0 ? (
              <EmptyState icon={StorefrontIcon} title="No products linked" hint="Products list their suppliers on the item's Suppliers tab." />
            ) : (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full min-w-[720px] border-collapse">
                  <caption className="sr-only">Products supplied by {v.name}</caption>
                  <thead>
                    <tr className="border-y border-line-soft bg-[#FAFAFB]">
                      <th scope="col" className={th}>
                        Product
                      </th>
                      <th scope="col" className={th}>
                        Supplier SKU
                      </th>
                      <th scope="col" className={cn(th, "text-right")}>
                        Last cost
                      </th>
                      <th scope="col" className={cn(th, "text-right")}>
                        Available (all)
                      </th>
                      <th scope="col" className={th}>
                        Preferred
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplied.map((p) => {
                      const s = p.suppliers.find((x) => x.vendorId === id)!;
                      return (
                        <tr key={p.id} className="border-b border-line-soft last:border-0">
                          <td className={td}>
                            <span className="flex items-center gap-3">
                              <ProductThumb icon={p.icon} src={p.image} size={30} />
                              <span className="min-w-0">
                                <TextLink href={itemHref(p.id)} className="block truncate">
                                  {p.name}
                                </TextLink>
                                <span className="block font-mono text-[12px] leading-4 text-ink-muted">{p.sku}</span>
                              </span>
                            </span>
                          </td>
                          <td className={cn(td, "font-mono text-[12.5px]")}>{s.supplierSku}</td>
                          <td className={cn(td, "text-right tabular-nums")}>{formatCurrency(s.lastCost)}</td>
                          <td className={cn(td, "text-right tabular-nums")}>{formatNumber(p.available)}</td>
                          <td className={td}>
                            {s.preferred ? (
                              <span className="inline-flex items-center gap-1 text-[12.5px] font-medium text-ink">
                                <StarIcon size={13} weight="fill" aria-hidden className="text-inventory-action" /> Preferred
                              </span>
                            ) : (
                              <span className="text-ink-muted">Alternate</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {tab === "history" && (
          <div id="vendor-panel-history" role="tabpanel" aria-labelledby="vendor-tab-history">
            <DataTable
              rows={orders}
              columns={poColumns({ warehouses, hideVendor: true })}
              rowKey={(p) => p.id}
              onRowClick={(p) => router.push(recordHref("purchaseOrders", p.id))}
              caption={`Purchase orders with ${v.name}`}
              noun="purchase orders"
              minWidth={760}
              defaultSort={{ key: "orderDate", dir: "desc" }}
              empty={<EmptyState icon={ShoppingCartIcon} title="No purchase orders yet" />}
            />
          </div>
        )}
      </Card>
      {editing && <VendorFormDialog vendor={v} onClose={() => setEditing(false)} />}
      {archive.dialog}
    </PageShell>
  );
}
