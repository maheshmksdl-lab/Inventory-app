"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArchiveIcon, ArrowCounterClockwiseIcon, ArrowUUpLeftIcon, CoinsIcon, PencilSimpleIcon, PlusIcon, ShoppingBagIcon, TruckIcon } from "@phosphor-icons/react/dist/ssr";
import { soColumns, soTotal } from "@/components/sales/so-columns";
import { DataTable } from "@/components/shared/data-table";
import { ActivityList, Detail, DetailGrid, DetailSkeleton, MissingRecord, PrimaryLink, StatRow, StatTile } from "@/components/shared/doc-ui";
import { Card, CardHeader, OutlineButton, PageHeading, PageShell, ToneBadge, UnderlineTabs } from "@/components/shared/inventory-ui";
import { EmptyState } from "@/components/shared/state-panels";
import { useRecord, useRecords } from "@/hooks/use-operations";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { RECORD_STATUS } from "@/lib/operations-meta";
import { newHref, recordHref, ROUTES } from "@/lib/routes";
import type { DocActivity } from "@/lib/types/operations";
import { CustomerFormDialog } from "./partner-forms";
import { useCustomerArchive } from "./customers-view";

type Tab = "overview" | "orders" | "activity";

export function CustomerDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { data: c, isError } = useRecord("customers", id);
  const { data: sos } = useRecords("salesOrders");
  const { data: returns } = useRecords("salesReturns");
  const { data: warehouses } = useRecords("warehouses");
  const archive = useCustomerArchive();
  const [tab, setTab] = useState<Tab>("overview");
  const [editing, setEditing] = useState(false);
  const crumbs = [{ label: "Sales & Fulfilment" }, { label: "Customers", href: ROUTES.customers }, { label: c?.name ?? "Customer" }];

  const orders = useMemo(() => sos?.filter((s) => s.customerId === id), [sos, id]);
  // The customer's activity is the trail of their orders and returns.
  const activity: DocActivity[] = useMemo(() => {
    const fromOrders = (orders ?? []).flatMap((s) => s.activity.map((a) => ({ ...a, text: `${s.number}: ${a.text}` })));
    const fromReturns = (returns ?? []).filter((r) => r.customerId === id).map((r) => ({ at: `${r.requestedDate}T12:00:00`, text: `${r.number}: return requested`, user: r.createdBy }));
    return [...fromOrders, ...fromReturns].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 25);
  }, [orders, returns, id]);

  if (isError) return <MissingRecord crumbs={crumbs} noun="customer" backHref={ROUTES.customers} backLabel="Back to Customers" />;
  if (!c || !orders) return <DetailSkeleton crumbs={crumbs} />;

  const live = orders.filter((s) => s.status !== "cancelled" && s.status !== "draft");
  const open = orders.filter((s) => s.status === "confirmed" || s.status === "partially-fulfilled");
  const last = live.reduce<string | null>((m, s) => (!m || s.orderDate > m ? s.orderDate : m), null);
  const returnCount = (returns ?? []).filter((r) => r.customerId === id).length;

  return (
    <PageShell>
      <PageHeading
        crumbs={crumbs}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {c.name} <ToneBadge tone={RECORD_STATUS[c.status]} />
          </span>
        }
        description={
          <>
            <span className="font-mono">{c.code}</span> · {c.company}
          </>
        }
        actions={
          c.status === "active" ? (
            <>
              <OutlineButton icon={ArchiveIcon} onClick={() => archive.ask(c)}>
                Archive
              </OutlineButton>
              <OutlineButton icon={PencilSimpleIcon} onClick={() => setEditing(true)}>
                Edit
              </OutlineButton>
              <PrimaryLink href={newHref("salesOrders", { customer: c.id })} icon={PlusIcon}>
                New Sales Order
              </PrimaryLink>
            </>
          ) : (
            <OutlineButton icon={ArrowCounterClockwiseIcon} onClick={() => archive.restore(c)}>
              Restore customer
            </OutlineButton>
          )
        }
      />
      <StatRow>
        <StatTile label="Orders" value={formatNumber(orders.filter((s) => s.status !== "cancelled").length)} note={last ? `Last on ${formatDate(last)}` : "No confirmed orders"} icon={ShoppingBagIcon} tone="brand" />
        <StatTile label="Open orders" value={formatNumber(open.length)} note={formatCurrency(open.reduce((s, o) => s + soTotal(o), 0))} icon={TruckIcon} />
        <StatTile label="Order value (confirmed+)" value={formatCurrency(live.reduce((s, o) => s + soTotal(o), 0))} icon={CoinsIcon} />
        <StatTile label="Returns" value={formatNumber(returnCount)} icon={ArrowUUpLeftIcon} tone="coral" />
      </StatRow>
      <Card className="mt-4">
        <UnderlineTabs
          idPrefix="customer"
          label="Customer sections"
          value={tab}
          onChange={setTab}
          className="px-5 pt-3"
          tabs={[
            { value: "overview", label: "Overview" },
            { value: "orders", label: "Sales Orders", count: orders.length },
            { value: "activity", label: "Activity", count: activity.length },
          ]}
        />
        {tab === "overview" && (
          <div id="customer-panel-overview" role="tabpanel" aria-labelledby="customer-tab-overview">
            <CardHeader title="Customer details" />
            <DetailGrid>
              <Detail label="Customer name">{c.name}</Detail>
              <Detail label="Customer code" mono>
                {c.code}
              </Detail>
              <Detail label="Company">{c.company}</Detail>
              <Detail label="Contact person">{c.contactName}</Detail>
              <Detail label="Email">
                <a href={`mailto:${c.email}`} className="rounded hover:text-brand focus-visible:outline-2 focus-visible:outline-brand-action">
                  {c.email}
                </a>
              </Detail>
              <Detail label="Phone">{c.phone}</Detail>
              <Detail label="Billing address" className="sm:col-span-2 lg:col-span-1">
                {c.billingAddress}
              </Detail>
              <Detail label="Shipping address" className="sm:col-span-2 lg:col-span-1">
                {c.shippingAddress}
              </Detail>
              <Detail label="Customer since">{formatDate(c.createdAt)}</Detail>
            </DetailGrid>
          </div>
        )}
        {tab === "orders" && (
          <div id="customer-panel-orders" role="tabpanel" aria-labelledby="customer-tab-orders">
            <DataTable
              rows={orders}
              columns={soColumns({ warehouses, hideCustomer: true })}
              rowKey={(s) => s.id}
              onRowClick={(s) => router.push(recordHref("salesOrders", s.id))}
              caption={`Sales orders for ${c.name}`}
              noun="sales orders"
              minWidth={760}
              defaultSort={{ key: "orderDate", dir: "desc" }}
              empty={<EmptyState icon={ShoppingBagIcon} title="No sales orders yet" />}
            />
          </div>
        )}
        {tab === "activity" && (
          <div id="customer-panel-activity" role="tabpanel" aria-labelledby="customer-tab-activity" className="p-5 pt-4">
            <ActivityList items={activity} title="Recent activity" />
          </div>
        )}
      </Card>
      {editing && <CustomerFormDialog customer={c} onClose={() => setEditing(false)} />}
      {archive.dialog}
    </PageShell>
  );
}
