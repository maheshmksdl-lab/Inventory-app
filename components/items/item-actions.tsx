"use client";

import { useState } from "react";
import Link from "next/link";
import { ArchiveIcon, ArrowCounterClockwiseIcon, CopyIcon, DotsThreeIcon, EyeIcon, PencilSimpleIcon, SwatchesIcon, TrashIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog, IconButton } from "@/components/shared/inventory-ui";
import { useDeleteItems, useSetLifecycle } from "@/hooks/use-inventory";
import { pluralize } from "@/lib/format";
import { itemCloneHref, itemEditHref, itemHref, itemVariantNewHref } from "@/lib/routes";
import type { Product } from "@/lib/types/inventory";

/** Archive (with confirmation and Undo) or restore items; shared by the row menu, bulk bar and details page. */
export function useArchiveFlow() {
  const mutation = useSetLifecycle();
  const [pending, setPending] = useState<{ ids: string[]; label: string } | null>(null);

  const restore = (ids: string[], label: string, quiet = false) =>
    mutation.mutate(
      { ids, lifecycle: "active" },
      {
        onSuccess: (n) => !quiet && toast.success(n === 1 ? "Item restored" : `${pluralize(n, "item")} restored`, { description: label }),
        onError: (e) => toast.error("Couldn't restore", { description: e.message }),
      },
    );

  const confirm = (onDone?: (ids: string[]) => void) => {
    if (!pending) return;
    const { ids, label } = pending;
    mutation.mutate(
      { ids, lifecycle: "archived" },
      {
        onSuccess: (n) => {
          setPending(null);
          onDone?.(ids);
          toast.success(n === 1 ? "Item archived" : `${pluralize(n, "item")} archived`, {
            description: `${label} · kept for this session only`,
            action: { label: "Undo", onClick: () => restore(ids, label, true) },
          });
        },
        onError: (e) => toast.error("Couldn't archive", { description: e.message }),
      },
    );
  };

  const dialog = (onDone?: (ids: string[]) => void) => (
    <ConfirmDialog
      open={!!pending}
      onOpenChange={(o) => !o && setPending(null)}
      title={pending && pending.ids.length > 1 ? `Archive ${pending.ids.length} items?` : "Archive this item?"}
      description={
        <>
          <p>
            <span className="font-medium text-ink">{pending?.label}</span> will be hidden from the item list and dashboard totals. Stock records are kept, and you can restore archived items from the
            Archived filter.
          </p>
        </>
      }
      confirmLabel="Archive"
      pending={mutation.isPending}
      onConfirm={() => confirm(onDone)}
    />
  );

  return { ask: (ids: string[], label: string) => setPending({ ids, label }), restore, dialog, pending: mutation.isPending };
}

/**
 * Permanently delete items, with confirmation. Like Zoho, only items with no
 * stock or transactions can be deleted; the API explains why when it refuses,
 * and the toast offers archiving instead.
 */
export function useDeleteFlow(onArchiveInstead?: (ids: string[], label: string) => void) {
  const mutation = useDeleteItems();
  const [pending, setPending] = useState<{ ids: string[]; label: string } | null>(null);

  const confirm = (onDone?: (ids: string[]) => void) => {
    if (!pending) return;
    const { ids, label } = pending;
    mutation.mutate(ids, {
      onSuccess: (n) => {
        setPending(null);
        onDone?.(ids);
        toast.success(n === 1 ? "Item deleted" : `${pluralize(n, "item")} deleted`, { description: label });
      },
      onError: (e) => {
        setPending(null);
        toast.error("Couldn't delete", {
          description: e.message,
          action: onArchiveInstead ? { label: "Archive instead", onClick: () => onArchiveInstead(ids, label) } : undefined,
          duration: 8000,
        });
      },
    });
  };

  const dialog = (onDone?: (ids: string[]) => void) => (
    <ConfirmDialog
      open={!!pending}
      onOpenChange={(o) => !o && setPending(null)}
      title={pending && pending.ids.length > 1 ? `Delete ${pending.ids.length} items?` : "Delete this item?"}
      description={
        <p>
          <span className="font-medium text-ink">{pending?.label}</span> will be removed permanently, with its images. Items that have stock, transactions, variants or are part of a composite item
          can&apos;t be deleted: archive them instead to keep their history.
        </p>
      }
      confirmLabel="Delete"
      pending={mutation.isPending}
      onConfirm={() => confirm(onDone)}
    />
  );

  return { ask: (ids: string[], label: string) => setPending({ ids, label }), dialog, pending: mutation.isPending };
}

/** "⋯" menu on an item row or card. */
export function ItemRowMenu({
  item,
  onArchive,
  onRestore,
  onDelete,
}: {
  item: Pick<Product, "id" | "name" | "lifecycle" | "type" | "parentId">;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const archived = item.lifecycle === "archived";
  const canHaveVariants = item.type === "goods" && !item.parentId;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton aria-label={`Actions for ${item.name}`} onClick={(e) => e.stopPropagation()}>
          <DotsThreeIcon size={18} weight="bold" aria-hidden />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 rounded-xl" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem asChild>
          <Link href={itemHref(item.id)}>
            <EyeIcon aria-hidden /> View details
          </Link>
        </DropdownMenuItem>
        {!archived && (
          <DropdownMenuItem asChild>
            <Link href={itemEditHref(item.id)}>
              <PencilSimpleIcon aria-hidden /> Edit
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href={itemCloneHref(item.id)}>
            <CopyIcon aria-hidden /> Clone
          </Link>
        </DropdownMenuItem>
        {!archived && canHaveVariants && (
          <DropdownMenuItem asChild>
            <Link href={itemVariantNewHref(item.id)}>
              <SwatchesIcon aria-hidden /> Add variant
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {archived ? (
          <DropdownMenuItem onSelect={onRestore}>
            <ArrowCounterClockwiseIcon aria-hidden /> Restore
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={onArchive}>
            <ArchiveIcon aria-hidden /> Archive
          </DropdownMenuItem>
        )}
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <TrashIcon aria-hidden /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
