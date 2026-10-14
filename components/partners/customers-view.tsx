"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArchiveIcon, ArrowCounterClockwiseIcon, EyeIcon, PencilSimpleIcon, PlusIcon, UsersThreeIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { soTotal } from "@/components/sales/so-columns";
import { DataTable, ListToolbar, matches, type Column } from "@/components/shared/data-table";
import { TextLink } from "@/components/shared/doc-ui";
import { Card, ConfirmDialog, FilterSelect, PageHeading, PageShell, PrimaryButton, SearchInput, ToneBadge } from "@/components/shared/inventory-ui";
import { RowMenu } from "@/components/shared/row-menu";
import { EmptyState } from "@/components/shared/state-panels";
import { useRecords, useSaveRecord } from "@/hooks/use-operations";
import { formatCurrency, formatNumber } from "@/lib/format";
import { RECORD_STATUS } from "@/lib/operations-meta";
import { recordHref } from "@/lib/routes";
import type { CustomerRecord } from "@/lib/types/operations";
import { CustomerFormDialog } from "./partner-forms";

type Row = CustomerRecord & { orders: number; revenue: number };

export function useCustomerArchive() {
  const save = useSaveRecord("customers");
  const [target, setTarget] = useState<CustomerRecord | null>(null);
  const setStatus = async (c: CustomerRecord, status: CustomerRecord["status"]) => {
    await save.mutateAsync({ ...c, status });
    toast.success(status === "archived" ? `${c.name} archived` : `${c.name} restored`, {
      action: status === "archived" ? { label: "Undo", onClick: () => void save.mutateAsync({ ...c, status: "active" }) } : undefined,
    });
  };
  const dialog = (
    <ConfirmDialog
      open={!!target}
      onOpenChange={(o) => !o && setTarget(null)}
      title="Archive this customer?"
      description={
        <p>
          <span className="font-medium text-ink">{target?.name}</span> won&apos;t be offered on new sales orders. Past orders are kept and you can restore the customer later.
        </p>
      }
      confirmLabel="Archive customer"
      pending={save.isPending}
      onConfirm={() => {
        if (target) void setStatus(target, "archived").finally(() => setTarget(null));
      }}
    />
  );
  return { ask: setTarget, restore: (c: CustomerRecord) => void setStatus(c, "active"), dialog };
}

export function CustomersView() {
  const router = useRouter();
  const { data: customers } = useRecords("customers");
  const { data: sos } = useRecords("salesOrders");
  const archive = useCustomerArchive();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("active");
  const [editing, setEditing] = useState<CustomerRecord | "new" | null>(null);

  const rows: Row[] | undefined = useMemo(() => {
    if (!customers || !sos) return undefined;
    return customers.map((c) => {
      const mine = sos.filter((s) => s.customerId === c.id && s.status !== "cancelled");
      return { ...c, orders: mine.length, revenue: mine.filter((s) => s.status !== "draft").reduce((n, s) => n + soTotal(s), 0) };
    });
  }, [customers, sos]);
  const visible = useMemo(() => rows?.filter((c) => (!status || c.status === status) && matches(q, c.name, c.code, c.company, c.contactName, c.email, c.phone)), [rows, status, q]);
  const filtered = !!(q || status !== "active");

  const columns: Column<Row>[] = [
    {
      key: "name",
      header: "Customer",
      sortValue: (c) => c.name,
      cell: (c) => (
        <span className="block min-w-[170px]">
          <TextLink href={recordHref("customers", c.id)} className="font-semibold">
            {c.name}
          </TextLink>
          <span className="block font-mono text-[12px] leading-4 text-ink-muted">{c.code}</span>
        </span>
      ),
    },
    { key: "company", header: "Company", sortValue: (c) => c.company, cell: (c) => <span className="whitespace-nowrap">{c.company}</span> },
    {
      key: "contact",
      header: "Contact",
      sortValue: (c) => c.contactName,
      cell: (c) => (
        <span className="block whitespace-nowrap">
          <span className="block">{c.contactName}</span>
          <span className="block text-[12px] leading-4 text-ink-muted">{c.email}</span>
        </span>
      ),
    },
    { key: "phone", header: "Phone", cell: (c) => <span className="whitespace-nowrap">{c.phone}</span> },
    {
      key: "address",
      header: "Billing / shipping",
      cell: (c) => (
        <span className="block max-w-[220px]">
          <span className="block truncate">{c.billingAddress}</span>
          <span className="block truncate text-[12px] leading-4 text-ink-muted">{c.shippingAddress === c.billingAddress ? "Ships to billing address" : c.shippingAddress}</span>
        </span>
      ),
    },
    { key: "orders", header: "Orders", align: "right", sortValue: (c) => c.orders, cell: (c) => formatNumber(c.orders) },
    { key: "revenue", header: "Order value", align: "right", sortValue: (c) => c.revenue, cell: (c) => <span className="whitespace-nowrap">{formatCurrency(c.revenue)}</span> },
    { key: "status", header: "Status", sortValue: (c) => c.status, cell: (c) => <ToneBadge tone={RECORD_STATUS[c.status]} /> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      headerClassName: "w-12",
      cell: (c) => (
        <RowMenu
          label={`Actions for ${c.name}`}
          actions={[
            { label: "View details", icon: EyeIcon, href: recordHref("customers", c.id) },
            c.status === "active" && { label: "Edit", icon: PencilSimpleIcon, onSelect: () => setEditing(c) },
            c.status === "active" ? { label: "Archive", icon: ArchiveIcon, onSelect: () => archive.ask(c), destructive: true, separatorBefore: true } : { label: "Restore", icon: ArrowCounterClockwiseIcon, onSelect: () => archive.restore(c), separatorBefore: true },
          ]}
        />
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeading
        crumbs={[{ label: "Sales & Fulfilment" }, { label: "Customers" }]}
        title="Customers"
        description="Who you sell to, where they're billed and where orders ship."
        actions={
          <PrimaryButton icon={PlusIcon} onClick={() => setEditing("new")}>
            New Customer
          </PrimaryButton>
        }
      />
      <Card className="mt-5" label="Customers">
        <ListToolbar
          canClear={filtered}
          onClear={() => {
            setQ("");
            setStatus("active");
          }}
        >
          <SearchInput value={q} onChange={setQ} placeholder="Search name, code, company, contact…" label="Search customers" className="w-full sm:w-[300px]" />
          <FilterSelect
            label="Status"
            allLabel="All statuses"
            value={status}
            onChange={setStatus}
            options={[
              { value: "active", label: "Active" },
              { value: "archived", label: "Archived" },
            ]}
            className="w-full sm:w-[150px]"
          />
        </ListToolbar>
        <DataTable
          rows={visible}
          columns={columns}
          rowKey={(c) => c.id}
          onRowClick={(c) => router.push(recordHref("customers", c.id))}
          caption="Customers"
          noun="customers"
          minWidth={1180}
          defaultSort={{ key: "name", dir: "asc" }}
          resetKey={`${q}|${status}`}
          empty={<EmptyState icon={UsersThreeIcon} title={filtered ? "No customers match" : "No customers yet"} hint={filtered ? "Try a different search or status." : "Add your first customer."} />}
        />
      </Card>
      {editing && <CustomerFormDialog customer={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      {archive.dialog}
    </PageShell>
  );
}
