"use client";

import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { OutlineButton, PrimaryButton } from "@/components/shared/inventory-ui";
import { useStoredState } from "@/hooks/use-stored-state";
import { LOGIN_ROUTE } from "@/lib/routes";

/**
 * Frontend-only session, as in EVOQ Projects: this preview has no accounts or
 * server sessions, so "signed out" is a flag for this browser tab that hides
 * the workspace until the person logs in again.
 */
export function useSignedOut() {
  return useStoredState<boolean>("evoq-inventory:signed-out", false, "session");
}

export function LogoutDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const [, setSignedOut] = useSignedOut();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogTitle className="text-[17px] font-semibold text-ink">Log out of EVOQ Inventory?</DialogTitle>
        <DialogDescription className="text-[14px] leading-[22px] text-ink-muted">
          You&apos;ll leave the workspace in this browser tab. This preview has no real accounts, so no server session is ended.
        </DialogDescription>
        <DialogFooter className="mt-2 gap-2">
          <OutlineButton onClick={() => onOpenChange(false)}>Cancel</OutlineButton>
          <PrimaryButton
            onClick={() => {
              setSignedOut(true);
              onOpenChange(false);
              router.replace(LOGIN_ROUTE);
            }}
          >
            Log out
          </PrimaryButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
