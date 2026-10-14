"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArchiveIcon, ArrowCounterClockwiseIcon, EyeIcon, PencilSimpleIcon, PlusIcon, StorefrontIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { DataTable, ListToolbar, matches, type Column } from "@/components/shared/data-table";
import { TextLink } from "@/components/shared/doc-ui";
import { Card, ConfirmDialog, FilterSelect, PageHeading, PageShell, PrimaryButton, SearchInput, ToneBadge } from "@/components/shared/inventory-ui";
import { RowMenu } from "@/components/shared/row-menu";
import { EmptyState } from "@/components/shared/state-panels";
import { useProducts, useRecords, useSaveRecord } from "@/hooks/use-operations";
import { formatDate, formatNumber } from "@/lib/format";
import { RECORD_STATUS } from "@/lib/operations-meta";
import { recordHref } from "@/lib/routes";
import type { VendorRecord } from "@/lib/types/operations";
import { VendorFormDialog } from "./partner-forms";

type Row = VendorRecord & { productCount: number; lastPurchase: string | null };

/** Archive / restore with confirmation and Undo; shared by the list and the detail page. */
export function useVendorArchive() {
  const save = useSaveRecord("vendors");
  const [target, setTarget] = useState<VendorRecord | null>(null);
  const setStatus = async (v: VendorRecord, status: VendorRecord["status"]) => {
    await save.mutateAsync({ ...v, status });
    toast.success(status === "archived" ? `${v.name} archived` : `${v.name} restored`, {
      description: status === "archived" ? "Hidden from new purchase orders. Kept for this session only." : undefined,
      action: status === "archived" ? { label: "Undo", onClick: () => void save.mutateAsync({ ...v, status: "active" }) } : undefined,
    });
  };
  const dialog = (
    <ConfirmDialog
      open={!!target}
      onOpenChange={(o) => !o && setTarget(null)}
      title="Archive this vendor?"
      description={
        <p>
          <span className="font-medium text-ink">{target?.name}</span> won&apos;t be offered on new purchase orders. Existing orders, receipts and bills are kept, and you can restore the vendor at any time.
        </p>
      }
      confirmLabel="Archive vendor"
      pending={save.isPending}
      onConfirm={() => {
        if (target) void setStatus(target, "archived").finally(() => setTarget(null));
      }}
    />
  );
  return { ask: setTarget, restore: (v: VendorRecord) => void setStatus(v, "active"), dialog };
}

export function VendorsView() {
  const router = useRouter();
  const { data: vendors } = useRecords("vendors");
  const { data: pos } = useRecords("purchaseOrders");
  const { data: products } = useProducts();
  const archive = useVendorArchive();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("active");
  const [city, setCity] = useState("");
  const [editing, setEditing] = useState<VendorRecord | "new" | null>(null);

  const rows: Row[] | undefined = useMemo(() => {
    if (!vendors || !pos || !products) return undefined;
    return vendors.map((v) => {
      const orders = pos.filter((p) => p.vendorId === v.id && p.status !== "cancelled" && p.status !== "draft");
      return {
        ...v,
        productCount: products.filter((p) => p.lifecycle !== "archived" && p.suppliers.some((s) => s.vendorId === v.id)).length,
        lastPurchase: orders.reduce<string | null>((m, p) => (!m || p.orderDate > m ? p.orderDate : m), null),
      };
    });
  }, [vendors, pos, products]);
  const visible = useMemo(() => rows?.filter((v) => (!status || v.status === status) && (!city || v.city === city) && matches(q, v.name, v.code, v.contactName, v.email, v.phone)), [rows, status, city, q]);
  const filtered = !!(q || city || status !== "active");

  const columns: Column<Row>[] = [
    {
      key: "name",
      header: "Vendor",
      sortValue: (v) => v.name,
      cell: (v) => (
        <span className="block min-w-[180px]">
          <TextLink href={recordHref("vendors", v.id)} className="font-semibold">
            {v.name}
          </TextLink>
          <span className="block font-mono text-[12px] leading-4 text-ink-muted">{v.code}</span>
        </span>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      sortValue: (v) => v.contactName,
      cell: (v) => (
        <span className="block whitespace-nowrap">
          <span className="block">{v.contactName}</span>
          <span className="block text-[12px] leading-4 text-ink-muted">{v.email}</span>
        </span>
      ),
    },
    { key: "phone", header: "Phone", cell: (v) => <span className="whitespace-nowrap">{v.phone}</span> },
    { key: "address", header: "Address", sortValue: (v) => v.city, cell: (v) => <span className="block max-w-[220px] truncate">{`${v.address}, ${v.city}`}</span> },
    { key: "products", header: "Products", align: "right", sortValue: (v) => v.productCount, cell: (v) => formatNumber(v.productCount) },
    { key: "last", header: "Last purchase", sortValue: (v) => v.lastPurchase ?? "", cell: (v) => <span className="whitespace-nowrap">{v.lastPurchase ? formatDate(v.lastPurchase) : "—"}</span> },
    { key: "status", header: "Status", sortValue: (v) => v.status, cell: (v) => <ToneBadge tone={RECORD_STATUS[v.status]} /> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      headerClassName: "w-12",
      cell: (v) => (
        <RowMenu
          label={`Actions for ${v.name}`}
          actions={[
            { label: "View details", icon: EyeIcon, href: recordHref("vendors", v.id) },
            v.status === "active" && { label: "Edit", icon: PencilSimpleIcon, onSelect: () => setEditing(v) },
            v.status === "active" ? { label: "Archive", icon: ArchiveIcon, onSelect: () => archive.ask(v), destructive: true, separatorBefore: true } : { label: "Restore", icon: ArrowCounterClockwiseIcon, onSelect: () => archive.restore(v), separatorBefore: true },
          ]}
        />
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeading
        crumbs={[{ label: "Purchasing" }, { label: "Vendors" }]}
        title="Vendors"
        description="Suppliers you buy from, their contacts and what they supply."
        actions={
          <PrimaryButton icon={PlusIcon} onClick={() => setEditing("new")}>
            New Vendor
          </PrimaryButton>
        }
      />
      <Card className="mt-5" label="Vendors">
        <ListToolbar
          canClear={filtered}
          onClear={() => {
            setQ("");
            setCity("");
            setStatus("active");
          }}
        >
          <SearchInput value={q} onChange={setQ} placeholder="Search name, code, contact, email…" label="Search vendors" className="w-full sm:w-[300px]" />
          <FilterSelect label="City" allLabel="All cities" value={city} onChange={setCity} options={[...new Set((vendors ?? []).map((v) => v.city))].sort().map((c) => ({ value: c, label: c }))} className="w-full sm:w-[160px]" />
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
          rowKey={(v) => v.id}
          onRowClick={(v) => router.push(recordHref("vendors", v.id))}
          caption="Vendors"
          noun="vendors"
          minWidth={1060}
          defaultSort={{ key: "name", dir: "asc" }}
          resetKey={`${q}|${status}|${city}`}
          empty={<EmptyState icon={StorefrontIcon} title={filtered ? "No vendors match" : "No vendors yet"} hint={filtered ? "Try a different search or filter." : "Add the suppliers you buy from."} />}
        />
      </Card>
      {editing && <VendorFormDialog vendor={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={(v) => editing === "new" && router.push(recordHref("vendors", v.id))} />}
      {archive.dialog}
    </PageShell>
  );
}
