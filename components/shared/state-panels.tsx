import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

/** "Nothing here" block — icon tile, title, hint, next step. */
export function EmptyState({ icon: IconCmp, title, hint, action, className }: { icon: Icon; title: string; hint?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-14 text-center", className)}>
      <span className="mb-3 inline-flex size-12 items-center justify-center rounded-2xl bg-[#F2F4F7] text-ink-muted">
        <IconCmp size={22} aria-hidden />
      </span>
      <p className="text-label text-ink">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-caption text-ink-muted">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Non-technical error message with a recovery action. */
export function ErrorState({
  title = "Something went wrong",
  hint = "We couldn't load this right now. Please try again.",
  action,
  className,
}: {
  title?: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div role="alert" className={cn("flex flex-col items-center px-6 py-14 text-center", className)}>
      <span className="mb-3 inline-flex size-12 items-center justify-center rounded-2xl bg-[var(--danger-bg)] text-[var(--danger)]">
        <WarningCircleIcon size={22} aria-hidden />
      </span>
      <p className="text-label text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-caption text-ink-muted">{hint}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
