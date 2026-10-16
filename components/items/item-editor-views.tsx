"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, PackageIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, PageHeading, PageShell } from "@/components/shared/inventory-ui";
import { EmptyState } from "@/components/shared/state-panels";
import { useCreateItem, useItem, useUpdateItem } from "@/hooks/use-inventory";
import { useHydrated } from "@/hooks/use-hydrated";
import type { ItemDetail } from "@/lib/api/inventory";
import { getItemsListHref, itemEditHref, itemHref } from "@/lib/routes";
import { toCreateExtras, toItemInput } from "@/lib/schemas/item";
import type { ItemType } from "@/lib/types/inventory";
import { emptyItemOfType, ItemForm, toCloneValues, toFormValues, toVariantValues } from "./item-form";

const SESSION_NOTE = "Saved in this browser tab only — not sent to a server.";

function FormSkeleton() {
  return (
    <div className="mt-5 space-y-4" aria-busy="true" aria-label="Loading item">
      <Skeleton className="h-12 rounded-xl" />
      <Skeleton className="h-80 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
    </div>
  );
}

function Missing({ crumbs, title, hint, href, back }: { crumbs: { label: string; href?: string }[]; title: string; hint: string; href: string; back: string }) {
  return (
    <PageShell>
      <PageHeading crumbs={crumbs} title={crumbs[crumbs.length - 1].label} />
      <Card className="mt-5">
        <EmptyState
          icon={PackageIcon}
          title={title}
          hint={hint}
          action={
            <Link href={href} className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-white px-3.5 text-button-sm text-ink-body hover:bg-[#F9FAFB]">
              <ArrowLeftIcon size={15} aria-hidden /> {back}
            </Link>
          }
        />
      </Card>
    </PageShell>
  );
}

/** Loads an item once the page has hydrated (server HTML never holds demo data). */
function useHydratedItem(id: string, enabled = true) {
  const hydrated = useHydrated();
  const q = useItem(id, enabled);
  return { data: hydrated && enabled ? q.data : undefined, isError: enabled && q.isError };
}

/** New item, optionally of a given type (?type=service) or as a copy of another item (?clone=id). */
export function NewItemView({ type, cloneId }: { type?: ItemType; cloneId?: string }) {
  const router = useRouter();
  const create = useCreateItem();
  const listHref = getItemsListHref();
  const source = useHydratedItem(cloneId ?? "", !!cloneId);
  const crumbs = [{ label: "Inventory" }, { label: "Items & Products", href: listHref }, { label: cloneId ? "Clone item" : "New item" }];

  if (cloneId && source.isError) return <Missing crumbs={crumbs} title="The item to clone doesn't exist" hint="Demo data resets when the page reloads." href={listHref} back="Back to Items" />;

  return (
    <PageShell>
      <PageHeading
        crumbs={crumbs}
        title={cloneId ? `Clone ${source.data?.item.name ?? "item"}` : "New item"}
        description={cloneId ? "A copy with the same details. Give it its own name and SKU." : "Add goods, a service or a composite item to your catalogue."}
      />
      {cloneId && !source.data ? (
        <FormSkeleton />
      ) : (
        <ItemForm
          mode="create"
          initial={source.data ? toCloneValues(source.data.item) : emptyItemOfType(type ?? "goods")}
          submitLabel="Save item"
          onCancel={() => router.push(cloneId ? itemHref(cloneId) : listHref)}
          onSubmit={async (values) => {
            const item = await create.mutateAsync({ input: toItemInput(values), extras: toCreateExtras(values, null) });
            toast.success(cloneId ? "Item cloned" : "Item created", { description: `${item.name} · ${SESSION_NOTE}` });
            router.push(itemHref(item.id));
          }}
        />
      )}
    </PageShell>
  );
}

/** Options already taken by the family's items: they stay on the parent's option list. */
const usedOptionsOf = (d: ItemDetail) => {
  const out: Record<string, string[]> = {};
  for (const f of d.family) if (f.id !== d.item.id) for (const [k, v] of Object.entries(f.variantValues)) (out[k] ??= []).push(v);
  return out;
};

export function EditItemView({ id }: { id: string }) {
  const router = useRouter();
  const { data, isError } = useHydratedItem(id);
  const update = useUpdateItem(id);
  const listHref = getItemsListHref();
  const item = data?.item;
  const crumbs = [{ label: "Inventory" }, { label: "Items & Products", href: listHref }, { label: item?.name ?? "Item", href: itemHref(id) }, { label: "Edit" }];

  if (isError) return <Missing crumbs={crumbs} title="This item doesn't exist" hint="Demo data resets when the page reloads." href={listHref} back="Back to Items" />;
  if (item?.lifecycle === "archived") return <Missing crumbs={crumbs} title="Archived items can't be edited" hint="Restore the item from its details page first." href={itemHref(id)} back="Back to item" />;

  return (
    <PageShell>
      <PageHeading crumbs={crumbs} title={item ? `Edit ${item.name}` : "Edit item"} description="Update the item's details, images, pricing and stock settings." />
      {!item || !data ? (
        <FormSkeleton />
      ) : (
        <ItemForm
          // Remount when a different item (or a fresher copy) loads.
          key={`${item.id}-${item.updatedAt}`}
          mode="edit"
          initial={toFormValues(item)}
          selfId={item.id}
          variantOf={data.parent ? { parentName: data.parent.name, attributes: data.familyAttributes } : undefined}
          usedOptions={usedOptionsOf(data)}
          hasVariants={!item.parentId && data.family.length > 1}
          submitLabel="Save changes"
          onCancel={() => router.push(itemHref(id))}
          onSubmit={async (values) => {
            const saved = await update.mutateAsync(toItemInput(values));
            toast.success("Changes saved", { description: `${saved.name} · ${SESSION_NOTE}` });
            router.push(itemHref(id));
          }}
        />
      )}
    </PageShell>
  );
}

/** Add a variant to a goods item: starts from the parent's details, with the family's attributes to fill in. */
export function NewVariantView({ parentId }: { parentId: string }) {
  const router = useRouter();
  const { data, isError } = useHydratedItem(parentId);
  const create = useCreateItem();
  const listHref = getItemsListHref();
  const parent = data?.item;
  const crumbs = [{ label: "Inventory" }, { label: "Items & Products", href: listHref }, { label: parent?.name ?? "Item", href: itemHref(parentId) }, { label: "Add variant" }];

  if (isError) return <Missing crumbs={crumbs} title="This item doesn't exist" hint="Demo data resets when the page reloads." href={listHref} back="Back to Items" />;
  if (parent && (parent.type !== "goods" || parent.lifecycle === "archived" || parent.parentId))
    return (
      <Missing
        crumbs={crumbs}
        title={parent.parentId ? "Add variants from the parent item" : "Variants can only be added to active goods items"}
        hint={parent.parentId ? `${parent.name} is itself a variant. Open ${data?.parent?.name ?? "its parent"} to add another.` : "Services and composite items don't have variants."}
        href={itemHref(parent.parentId ?? parentId)}
        back={parent.parentId ? "Go to parent item" : "Back to item"}
      />
    );
  if (parent && parent.attributes.length === 0)
    return (
      <Missing
        crumbs={crumbs}
        title={`${parent.name} has no variant attributes yet`}
        hint="Edit the item and turn on Variants to define attributes such as Colour or Size. Then add variants here."
        href={itemEditHref(parentId)}
        back="Edit item"
      />
    );

  return (
    <PageShell>
      <PageHeading crumbs={crumbs} title={parent ? `${parent.name} / Add variant` : "Add variant"} description="A new item in the same family, with its own SKU, price, stock and images." />
      {!parent ? (
        <FormSkeleton />
      ) : (
        <ItemForm
          mode="create"
          initial={toVariantValues(parent)}
          variantOf={{ parentName: parent.name, attributes: parent.attributes }}
          submitLabel="Save variant"
          onCancel={() => router.push(itemHref(parentId))}
          onSubmit={async (values) => {
            const item = await create.mutateAsync({ input: toItemInput(values), extras: toCreateExtras(values, parentId) });
            toast.success("Variant added", { description: `${item.name} · ${SESSION_NOTE}` });
            router.push(itemHref(item.id));
          }}
        />
      )}
    </PageShell>
  );
}
