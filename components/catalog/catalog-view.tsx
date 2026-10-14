"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArchiveIcon, ArrowCounterClockwiseIcon, PencilSimpleIcon, PlusIcon, TagIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { z } from "zod";
import { DataTable, ListToolbar, matches, type Column } from "@/components/shared/data-table";
import { StatRow, StatTile } from "@/components/shared/doc-ui";
import { FormDialog, SESSION_NOTE, TextAreaField, TextField, useZodForm } from "@/components/shared/form-kit";
import { Card, ConfirmDialog, FilterSelect, OutlineButton, PageHeading, PageShell, PrimaryButton, SearchInput, ToneBadge, UnderlineTabs } from "@/components/shared/inventory-ui";
import { RowMenu } from "@/components/shared/row-menu";
import { EmptyState } from "@/components/shared/state-panels";
import { useProducts, useRecords, useSaveRecord } from "@/hooks/use-operations";
import { formatDate, formatNumber } from "@/lib/format";
import { RECORD_STATUS } from "@/lib/operations-meta";
import { ITEMS_ROUTE } from "@/lib/routes";
import type { CatalogEntry } from "@/lib/types/operations";

type Kind = "categories" | "brands";
const NOUN: Record<Kind, { one: string; many: string; field: "category" | "brand" }> = {
  categories: { one: "category", many: "categories", field: "category" },
  brands: { one: "brand", many: "brands", field: "brand" },
};

const schema = z.object({
  name: z.string().trim().min(2, "Enter a name (at least 2 characters)").max(60, "Keep the name under 60 characters"),
  description: z.string().trim().max(240, "Keep the description under 240 characters"),
});
type Values = { name: string; description: string };

function EntryDialog({ kind, entry, onClose }: { kind: Kind; entry: CatalogEntry | null; onClose: () => void }) {
  const save = useSaveRecord(kind);
  const noun = NOUN[kind].one;
  const form = useZodForm<Values>(schema, { name: entry?.name ?? "", description: entry?.description ?? "" }, `${kind}-form`);
  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={entry ? `Edit ${noun}` : `New ${noun}`}
      description={entry ? `Renaming updates every item in this ${noun}.` : `Active ${NOUN[kind].many} appear in the item form and Items filters.`}
      submitLabel={entry ? "Save changes" : `Create ${noun}`}
      saving={form.saving}
      onSubmit={form.handleSubmit(async (v) => {
        const saved = await save.mutateAsync({ id: entry?.id ?? "", name: v.name.trim(), description: v.description.trim(), status: entry?.status ?? "active", createdAt: entry?.createdAt ?? new Date().toISOString().slice(0, 19) });
        toast.success(entry ? "Changes saved" : `${noun[0].toUpperCase()}${noun.slice(1)} created`, { description: `${saved.name} · ${SESSION_NOTE}` });
        onClose();
      })}
    >
      <TextField form={form} name="name" label="Name" required className="sm:col-span-2" autoComplete="off" maxLength={60} placeholder={kind === "categories" ? "e.g. Cables" : "e.g. Northwind"} />
      <TextAreaField form={form} name="description" label="Description" className="sm:col-span-2" maxLength={240} hint={`${form.values.description.length}/240`} />
    </FormDialog>
  );
}

function CatalogTable({ kind, onEdit, onArchive, onRestore }: { kind: Kind; onEdit: (e: CatalogEntry) => void; onArchive: (e: CatalogEntry) => void; onRestore: (e: CatalogEntry) => void }) {
  const { data } = useRecords(kind);
  const { data: products } = useProducts();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("active");
  const field = NOUN[kind].field;
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of products ?? []) if (p.lifecycle !== "archived") m.set(p[field], (m.get(p[field]) ?? 0) + 1);
    return m;
  }, [products, field]);
  const rows = useMemo(() => data?.filter((e) => (!status || e.status === status) && matches(q, e.name, e.description)), [data, status, q]);
  const filtered = !!q || status !== "active";

  const columns: Column<CatalogEntry>[] = [
    {
      key: "name",
      header: "Name",
      sortValue: (e) => e.name.toLowerCase(),
      cell: (e) => (
        <button type="button" onClick={() => onEdit(e)} className="rounded text-left font-semibold text-ink hover:text-brand focus-visible:outline-2 focus-visible:outline-brand-action" disabled={e.status === "archived"}>
          {e.name}
        </button>
      ),
    },
    { key: "description", header: "Description", cell: (e) => <span className="line-clamp-2 max-w-[420px] text-ink-muted">{e.description || "—"}</span> },
    {
      key: "items",
      header: "Items",
      align: "right",
      sortValue: (e) => counts.get(e.name) ?? 0,
      cell: (e) => {
        const n = counts.get(e.name) ?? 0;
        return n ? (
          <Link href={`${ITEMS_ROUTE}?${field}=${encodeURIComponent(e.name)}`} className="rounded font-medium text-ink hover:text-brand focus-visible:outline-2 focus-visible:outline-brand-action">
            {formatNumber(n)}
          </Link>
        ) : (
          <span className="text-ink-muted">0</span>
        );
      },
    },
    { key: "status", header: "Status", sortValue: (e) => e.status, cell: (e) => <ToneBadge tone={RECORD_STATUS[e.status]} /> },
    { key: "created", header: "Created", sortValue: (e) => e.createdAt, cell: (e) => <span className="whitespace-nowrap">{formatDate(e.createdAt)}</span> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      headerClassName: "w-12",
      cell: (e) => (
        <RowMenu
          label={`Actions for ${e.name}`}
          actions={[
            e.status === "active" && { label: "Edit", icon: PencilSimpleIcon, onSelect: () => onEdit(e) },
            e.status === "active" ? { label: "Archive", icon: ArchiveIcon, onSelect: () => onArchive(e), destructive: true, separatorBefore: true } : { label: "Restore", icon: ArrowCounterClockwiseIcon, onSelect: () => onRestore(e) },
          ]}
        />
      ),
    },
  ];

  return (
    <div id={`catalog-panel-${kind}`} role="tabpanel" aria-labelledby={`catalog-tab-${kind}`}>
      <ListToolbar
        canClear={filtered}
        onClear={() => {
          setQ("");
          setStatus("active");
        }}
      >
        <SearchInput value={q} onChange={setQ} placeholder={`Search ${NOUN[kind].many}…`} label={`Search ${NOUN[kind].many}`} className="w-full sm:w-[300px]" />
        <FilterSelect
          label="Status"
          allLabel="All statuses"
          value={status}
          onChange={setStatus}
          options={[
            { value: "active", label: "Active" },
            { value: "archived", label: "Archived" },
          ]}
          className="w-full sm:w-[170px]"
        />
      </ListToolbar>
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(e) => e.id}
        caption={NOUN[kind].many}
        noun={NOUN[kind].many}
        minWidth={760}
        defaultSort={{ key: "name", dir: "asc" }}
        resetKey={`${q}|${status}`}
        empty={<EmptyState icon={TagIcon} title={filtered ? `No ${NOUN[kind].many} match` : `No ${NOUN[kind].many} yet`} hint={filtered ? "Try a different search or status." : `Create a ${NOUN[kind].one} to group your items.`} />}
      />
    </div>
  );
}

export function CatalogView({ initialTab }: { initialTab?: string }) {
  const [tab, setTab] = useState<Kind>(initialTab === "brands" ? "brands" : "categories");
  const [editing, setEditing] = useState<{ kind: Kind; entry: CatalogEntry | null } | null>(null);
  const [archiving, setArchiving] = useState<{ kind: Kind; entry: CatalogEntry } | null>(null);
  const { data: categories } = useRecords("categories");
  const { data: brands } = useRecords("brands");
  const saveCategory = useSaveRecord("categories");
  const saveBrand = useSaveRecord("brands");

  const setStatus = async (kind: Kind, entry: CatalogEntry, status: CatalogEntry["status"]) => {
    const save = kind === "categories" ? saveCategory : saveBrand;
    try {
      await save.mutateAsync({ ...entry, status });
      toast.success(status === "archived" ? `${entry.name} archived` : `${entry.name} restored`, {
        description: status === "archived" ? "Items keep it; it's no longer offered for new items." : SESSION_NOTE,
        action: status === "archived" ? { label: "Undo", onClick: () => void save.mutateAsync({ ...entry, status: "active" }) } : undefined,
      });
    } catch (e) {
      toast.error("Couldn't update", { description: e instanceof Error ? e.message : undefined });
    }
  };

  const count = (list: CatalogEntry[] | undefined) => list?.filter((e) => e.status === "active").length;

  return (
    <PageShell>
      <PageHeading
        crumbs={[{ label: "Inventory" }, { label: "Categories & Brands" }]}
        title="Categories & Brands"
        description="Group items for filtering and reporting. Changes here appear in the item form and Items filters."
        actions={
          <>
            <OutlineButton icon={PlusIcon} onClick={() => setEditing({ kind: "brands", entry: null })}>
              New Brand
            </OutlineButton>
            <PrimaryButton icon={PlusIcon} onClick={() => setEditing({ kind: "categories", entry: null })}>
              New Category
            </PrimaryButton>
          </>
        }
      />
      <StatRow>
        <StatTile label="Active categories" value={count(categories)} icon={TagIcon} tone="brand" />
        <StatTile label="Active brands" value={count(brands)} icon={TagIcon} />
        <StatTile label="Archived categories" value={categories?.filter((e) => e.status === "archived").length} />
        <StatTile label="Archived brands" value={brands?.filter((e) => e.status === "archived").length} />
      </StatRow>
      <Card className="mt-4" label="Categories and brands">
        <UnderlineTabs
          idPrefix="catalog"
          label="Catalogue groups"
          value={tab}
          onChange={setTab}
          className="px-5 pt-3"
          tabs={[
            { value: "categories", label: "Categories", count: count(categories) },
            { value: "brands", label: "Brands", count: count(brands) },
          ]}
        />
        <CatalogTable
          key={tab}
          kind={tab}
          onEdit={(entry) => setEditing({ kind: tab, entry })}
          onArchive={(entry) => setArchiving({ kind: tab, entry })}
          onRestore={(entry) => void setStatus(tab, entry, "active")}
        />
      </Card>

      {editing && <EntryDialog key={`${editing.kind}-${editing.entry?.id ?? "new"}`} kind={editing.kind} entry={editing.entry} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!archiving}
        onOpenChange={(o) => !o && setArchiving(null)}
        title={`Archive this ${archiving ? NOUN[archiving.kind].one : ""}?`}
        description={
          <p>
            <span className="font-medium text-ink">{archiving?.entry.name}</span> will no longer be offered when creating or editing items. Items already in it keep it, and you can restore it at any time.
          </p>
        }
        confirmLabel="Archive"
        onConfirm={() => {
          if (archiving) void setStatus(archiving.kind, archiving.entry, "archived");
          setArchiving(null);
        }}
      />
    </PageShell>
  );
}
