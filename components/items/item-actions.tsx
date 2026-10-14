"use client";

import { useState } from "react";
import Link from "next/link";
import { ArchiveIcon, ArrowCounterClockwiseIcon, DotsThreeIcon, EyeIcon, PencilSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog, IconButton } from "@/components/shared/inventory-ui";
import { useSetLifecycle } from "@/hooks/use-inventory";
import { pluralize } from "@/lib/format";
import { itemEditHref, itemHref } from "@/lib/routes";
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

/** "⋯" menu on an item row or card. */
export function ItemRowMenu({ item, onArchive, onRestore }: { item: Pick<Product, "id" | "name" | "lifecycle">; onArchive: () => void; onRestore: () => void }) {
  const archived = item.lifecycle === "archived";
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
        <DropdownMenuSeparator />
        {archived ? (
          <DropdownMenuItem onSelect={onRestore}>
            <ArrowCounterClockwiseIcon aria-hidden /> Restore
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem variant="destructive" onSelect={onArchive}>
            <ArchiveIcon aria-hidden /> Archive
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
