"use client";

import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import type { Icon } from "@phosphor-icons/react";
import { ArrowLeftIcon, CheckIcon, FileDashedIcon, FlaskIcon } from "@phosphor-icons/react/dist/ssr";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, PageHeading, PageShell, type Crumb } from "@/components/shared/inventory-ui";
import { EmptyState } from "@/components/shared/state-panels";
import type { DocTotals } from "@/lib/doc-math";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { DocActivity } from "@/lib/types/operations";
import { cn } from "@/lib/utils";

// ── Links styled as buttons ──────────────────────────────────────────

const primaryLink =
  "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-button whitespace-nowrap text-white shadow-[0_1px_2px_rgb(125_17_73/0.2)] transition-colors hover:bg-brand-press focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action";
const outlineLink =
  "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3.5 text-button-sm whitespace-nowrap text-ink-body transition-colors hover:border-[#D0D5DD] hover:bg-[#F9FAFB] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action";

export function PrimaryLink({ icon: IconCmp, children, className, ...props }: ComponentProps<typeof Link> & { icon?: Icon }) {
  return (
    <Link className={cn(primaryLink, className)} {...props}>
      {IconCmp && <IconCmp size={16} weight="bold" aria-hidden />}
      {children}
    </Link>
  );
}

export function OutlineLink({ icon: IconCmp, children, className, ...props }: ComponentProps<typeof Link> & { icon?: Icon }) {
  return (
    <Link className={cn(outlineLink, className)} {...props}>
      {IconCmp && <IconCmp size={16} aria-hidden />}
      {children}
    </Link>
  );
}

/** Inline text link (document numbers, related records). */
export function TextLink({ className, ...props }: ComponentProps<typeof Link>) {
  return <Link className={cn("rounded font-medium text-ink hover:text-brand focus-visible:outline-2 focus-visible:outline-brand-action", className)} onClick={(e) => e.stopPropagation()} {...props} />;
}

// ── Notices ──────────────────────────────────────────────────────────

/**
 * States plainly what a screen does not do (no stock moved, no email sent…).
 * Neutral by default; "prototype" adds a small label for simulated actions.
 */
export function PrototypeNote({ children, className, label = "Prototype" }: { children: ReactNode; className?: string; label?: string | null }) {
  return (
    <div role="note" className={cn("flex items-start gap-2.5 rounded-xl border border-line bg-white px-4 py-3 text-[13px] leading-5 text-ink-body print:hidden", className)}>
      <FlaskIcon size={18} aria-hidden className="mt-px shrink-0 text-ink-muted" />
      <p>
        {label && <span className="mr-1.5 rounded-full bg-[#F2F4F7] px-1.5 py-px text-[11px] font-medium text-ink-muted">{label}</span>}
        {children}
      </p>
    </div>
  );
}

// ── Detail blocks ────────────────────────────────────────────────────

export function Detail({ label, children, mono, className }: { label: string; children: ReactNode; mono?: boolean; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[12px] leading-4 text-ink-muted">{label}</dt>
      <dd className={cn("mt-1 text-[13.5px] leading-5 break-words text-ink", mono && "font-mono text-[13px]")}>{children}</dd>
    </div>
  );
}

export function DetailGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn("grid grid-cols-1 gap-x-6 gap-y-4 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-3", className)}>{children}</dl>;
}

export function ActivityList({ items, title = "Activity" }: { items: DocActivity[]; title?: string }) {
  return (
    <Card>
      <CardHeader title={title} subtitle="Newest first" />
      {items.length === 0 ? (
        <p className="px-5 pb-5 text-[13px] text-ink-muted">No activity yet.</p>
      ) : (
        <ol className="px-5 pb-5">
          {items.map((a, i) => (
            <li key={`${a.at}-${i}`} className="relative flex gap-3 pb-4 last:pb-0">
              {i < items.length - 1 && <span className="absolute top-4 bottom-0 left-[5px] w-px bg-line" aria-hidden />}
              <span className={cn("relative mt-1.5 size-[11px] shrink-0 rounded-full border-2 border-white ring-1", i === 0 ? "bg-brand ring-brand-soft" : "bg-[#D0D5DD] ring-line")} aria-hidden />
              <div className="min-w-0">
                <p className="text-[13.5px] leading-5 text-ink">{a.text}</p>
                <p className="text-[12px] leading-4 text-ink-muted">
                  {a.user} · {formatDateTime(a.at)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

/** Subtotal / discount / tax / total stack. */
export function TotalsPanel({ totals, className, label = "Total" }: { totals: DocTotals; className?: string; label?: string }) {
  const row = "flex items-center justify-between gap-6 text-[13px] leading-6";
  return (
    <dl className={cn("ml-auto w-full max-w-xs", className)}>
      <div className={row}>
        <dt className="text-ink-muted">Subtotal</dt>
        <dd className="text-ink tabular-nums">{formatCurrency(totals.subtotal, { decimals: true })}</dd>
      </div>
      {totals.discount > 0 && (
        <div className={row}>
          <dt className="text-ink-muted">Discount</dt>
          <dd className="text-ink tabular-nums">−{formatCurrency(totals.discount, { decimals: true })}</dd>
        </div>
      )}
      <div className={row}>
        <dt className="text-ink-muted">Tax (GST)</dt>
        <dd className="text-ink tabular-nums">{formatCurrency(totals.tax, { decimals: true })}</dd>
      </div>
      <div className={cn(row, "mt-1 border-t border-line pt-2 text-[15px]")}>
        <dt className="font-semibold text-ink">{label}</dt>
        <dd className="font-semibold text-ink tabular-nums">{formatCurrency(totals.total, { decimals: true })}</dd>
      </div>
    </dl>
  );
}

/** Horizontal workflow steps (Draft → Submitted → …). */
export function StatusSteps<S extends string>({ steps, current, labels, cancelled }: { steps: S[]; current: S; labels: Record<S, string>; cancelled?: boolean }) {
  const idx = steps.indexOf(current);
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2" aria-label="Workflow progress">
      {steps.map((s, i) => {
        const done = !cancelled && i < idx;
        const now = !cancelled && i === idx;
        return (
          <li key={s} className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12.5px] font-medium whitespace-nowrap",
                now ? "border-brand-soft bg-brand-surface text-brand" : done ? "border-line bg-white text-ink" : "border-line-soft bg-[#FAFAFB] text-ink-faint",
              )}
              aria-current={now ? "step" : undefined}
            >
              {done && <CheckIcon size={12} weight="bold" aria-hidden className="text-[var(--success)]" />}
              {labels[s]}
            </span>
            {i < steps.length - 1 && <span className="h-px w-3 bg-line" aria-hidden />}
          </li>
        );
      })}
      {cancelled && <li className="ml-1 text-[12.5px] font-medium text-[var(--danger)]">Cancelled</li>}
    </ol>
  );
}

// ── Page states ──────────────────────────────────────────────────────

export function DetailSkeleton({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <PageShell>
      <PageHeading crumbs={crumbs} title={<Skeleton className="h-8 w-56" />} />
      <div className="mt-5 space-y-4" aria-busy="true" aria-label="Loading">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </PageShell>
  );
}

/** Record id not in the demo store (bad link, or created before a reload). */
export function MissingRecord({ crumbs, noun, backHref, backLabel }: { crumbs: Crumb[]; noun: string; backHref: string; backLabel: string }) {
  return (
    <PageShell>
      <PageHeading crumbs={crumbs} title={`${noun[0].toUpperCase()}${noun.slice(1)} not found`} />
      <Card className="mt-5">
        <EmptyState
          icon={FileDashedIcon}
          title={`This ${noun} doesn't exist`}
          hint="The link may be wrong, or it was created in an earlier session — demo data resets when the page reloads."
          action={
            <OutlineLink href={backHref} icon={ArrowLeftIcon}>
              {backLabel}
            </OutlineLink>
          }
        />
      </Card>
    </PageShell>
  );
}

/** Compact metric tile for list pages (no link). */
export function StatTile({ label, value, note, tone = "neutral", icon: IconCmp }: { label: string; value: ReactNode; note?: ReactNode; tone?: "brand" | "coral" | "neutral"; icon?: Icon }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-line bg-card px-4 py-3 shadow-card">
      {IconCmp && (
        <span
          className={cn(
            "inline-flex size-9 shrink-0 items-center justify-center rounded-full",
            tone === "brand" ? "bg-inventory-surface text-inventory" : tone === "coral" ? "bg-coral-10 text-[#D9443F]" : "bg-[#F2F4F7] text-[#475467]",
          )}
          aria-hidden
        >
          <IconCmp size={18} />
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate text-[12.5px] leading-4 text-ink-muted">{label}</span>
        <span className="block truncate text-[20px] leading-7 font-semibold text-ink tabular-nums">{value ?? <Skeleton className="mt-1 h-5 w-12" />}</span>
        {note && <span className="block truncate text-[12px] leading-4 text-ink-muted">{note}</span>}
      </span>
    </div>
  );
}

export function StatRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4", className)}>{children}</div>;
}
