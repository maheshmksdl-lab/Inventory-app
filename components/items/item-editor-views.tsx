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
import { getItemsListHref, itemHref } from "@/lib/routes";
import { EMPTY_ITEM, ItemForm, toFormValues } from "./item-form";

const SESSION_NOTE = "Saved in this browser tab only — not sent to a server.";

export function NewItemView() {
  const router = useRouter();
  const create = useCreateItem();
  const listHref = getItemsListHref();
  return (
    <PageShell>
      <PageHeading
        crumbs={[{ label: "Inventory" }, { label: "Items & Products", href: listHref }, { label: "New item" }]}
        title="New item"
        description="Add a product to your catalogue. Stock is recorded separately once it arrives."
      />
      <ItemForm
        mode="create"
        initial={EMPTY_ITEM}
        submitLabel="Create item"
        onCancel={() => router.push(listHref)}
        onSubmit={async (input) => {
          const item = await create.mutateAsync(input);
          toast.success("Item created", { description: `${item.name} · ${SESSION_NOTE}` });
          router.push(itemHref(item.id));
        }}
      />
    </PageShell>
  );
}

export function EditItemView({ id }: { id: string }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const { data: fetched, isError } = useItem(id);
  const data = hydrated ? fetched : undefined;
  const update = useUpdateItem(id);
  const listHref = getItemsListHref();
  const item = data?.item;

  const crumbs = [{ label: "Inventory" }, { label: "Items & Products", href: listHref }, { label: item?.name ?? "Item", href: itemHref(id) }, { label: "Edit" }];

  if (isError || item?.lifecycle === "archived") {
    return (
      <PageShell>
        <PageHeading crumbs={crumbs} title="Edit item" />
        <Card className="mt-5">
          <EmptyState
            icon={PackageIcon}
            title={isError ? "This item doesn't exist" : "Archived items can't be edited"}
            hint={isError ? "Demo data resets when the page reloads." : "Restore the item from its details page first."}
            action={
              <Link href={isError ? listHref : itemHref(id)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-white px-3.5 text-button-sm text-ink-body hover:bg-[#F9FAFB]">
                <ArrowLeftIcon size={15} aria-hidden /> {isError ? "Back to Items" : "Back to item"}
              </Link>
            }
          />
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeading crumbs={crumbs} title={item ? `Edit ${item.name}` : "Edit item"} description="Update product details, pricing and stock settings." />
      {!item ? (
        <div className="mt-5 space-y-4" aria-busy="true" aria-label="Loading item">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : (
        <ItemForm
          // Remount when a different item (or a fresher copy) loads.
          key={`${item.id}-${item.updatedAt}`}
          mode="edit"
          initial={toFormValues(item)}
          submitLabel="Save changes"
          onCancel={() => router.push(itemHref(id))}
          onSubmit={async (input) => {
            const saved = await update.mutateAsync(input);
            toast.success("Changes saved", { description: `${saved.name} · ${SESSION_NOTE}` });
            router.push(itemHref(id));
          }}
        />
      )}
    </PageShell>
  );
}
