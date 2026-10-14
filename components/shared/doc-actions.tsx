"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/inventory-ui";
import { useSaveRecord } from "@/hooks/use-operations";
import type { CollectionKey, RecordOf } from "@/lib/api/operations";
import { nowIso } from "@/lib/format";
import type { DocActivity } from "@/lib/types/operations";

const USER = "Admin User";

/**
 * Applies a patch to a document, logs it on the activity trail (when the
 * document has one) and confirms with a toast. Used by every workflow button.
 */
export function useDocUpdate<K extends CollectionKey>(kind: K) {
  const save = useSaveRecord(kind);
  const run = async (rec: RecordOf<K>, patch: Partial<RecordOf<K>>, log: string | null, title: string, description?: string) => {
    const withActivity = rec as RecordOf<K> & { activity?: DocActivity[] };
    const next = { ...rec, ...patch } as RecordOf<K> & { activity?: DocActivity[] };
    if (log && withActivity.activity) next.activity = [{ at: nowIso(), text: log, user: USER }, ...withActivity.activity];
    try {
      await save.mutateAsync(next);
      toast.success(title, { description: description ?? "Demo record updated in this browser tab only." });
    } catch (e) {
      toast.error("Couldn't update", { description: e instanceof Error ? e.message : "Please try again." });
    }
  };
  return { run, pending: save.isPending };
}

export interface PendingAction {
  title: string;
  body: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  run: () => Promise<void> | void;
}

/** One confirm dialog per page, driven by the action that asked for it. */
export function useConfirmAction() {
  const [action, setAction] = useState<PendingAction | null>(null);
  const [busy, setBusy] = useState(false);
  const dialog = (
    <ConfirmDialog
      open={!!action}
      onOpenChange={(o) => !o && setAction(null)}
      title={action?.title ?? ""}
      description={action?.body ?? ""}
      confirmLabel={action?.confirmLabel ?? "Confirm"}
      destructive={action?.destructive ?? false}
      pending={busy}
      onConfirm={async () => {
        if (!action) return;
        setBusy(true);
        await action.run();
        setBusy(false);
        setAction(null);
      }}
    />
  );
  return { ask: setAction, dialog };
}
