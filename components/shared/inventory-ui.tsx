"use client";

/**
 * Inventory building blocks — page chrome, cards, buttons, badges, tabs,
 * form fields, dialogs and pagination — on shadcn/ui + Tailwind in the
 * Inventory palette. The same set as Projects' shared/project-ui.tsx and
 * workspace-ui.tsx, so the apps read as one product family.
 */
import { Fragment, useEffect, useState, type ComponentProps, type ReactElement, type ReactNode } from "react";
import Link from "next/link";
import type { Icon } from "@phosphor-icons/react";
import { ArrowRightIcon, CaretLeftIcon, CaretRightIcon, MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { STATUS_META, type Tone } from "@/lib/inventory-meta";
import type { DisplayStatus } from "@/lib/types/inventory";
import { cn } from "@/lib/utils";

// ── Page chrome ──────────────────────────────────────────────────────

export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8 lg:py-6", className)}>{children}</div>;
}

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex min-w-0 flex-wrap items-center gap-1.5 text-[12.5px] leading-5 text-ink-muted">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <Fragment key={`${c.label}-${i}`}>
              <li className={cn("min-w-0", last && "truncate")}>
                {c.href && !last ? (
                  <Link href={c.href} className="rounded transition-colors hover:text-brand focus-visible:outline-2 focus-visible:outline-brand-action">
                    {c.label}
                  </Link>
                ) : (
                  <span aria-current={last ? "page" : undefined} className={cn(last && "font-medium text-ink-body")}>
                    {c.label}
                  </span>
                )}
              </li>
              {!last && (
                <li aria-hidden className="text-ink-faint">
                  /
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

/** Title row: breadcrumb, heading, description and actions. */
export function PageHeading({ title, description, crumbs, actions, children }: { title: ReactNode; description?: ReactNode; crumbs?: Crumb[]; actions?: ReactNode; children?: ReactNode }) {
  return (
    <div>
      {crumbs && <Breadcrumbs items={crumbs} className="mb-2" />}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-[22px] leading-8 font-semibold tracking-[-0.01em] text-ink sm:text-[24px]">{title}</h1>
          {description && <p className="mt-0.5 text-[14px] leading-5 text-ink-muted">{description}</p>}
          {children}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

// ── Cards ────────────────────────────────────────────────────────────

export function Card({ label, children, className }: { label?: string; children: ReactNode; className?: string }) {
  return (
    <section aria-label={label} className={cn("min-w-0 rounded-xl border border-line bg-card shadow-card", className)}>
      {children}
    </section>
  );
}

export function CardHeader({ title, subtitle, action, className }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <header className={cn("flex items-start gap-3 px-5 pt-4 pb-3", className)}>
      <div className="min-w-0">
        <h2 className="truncate text-[15px] leading-6 font-semibold text-ink">{title}</h2>
        {subtitle && <p className="truncate text-[12px] leading-4 text-ink-muted">{subtitle}</p>}
      </div>
      {action && <div className="ml-auto flex shrink-0 items-center gap-2">{action}</div>}
    </header>
  );
}

const viewAllClass =
  "inline-flex items-center gap-1.5 rounded text-[13px] leading-5 font-medium whitespace-nowrap text-brand transition-colors hover:text-brand-press focus-visible:outline-2 focus-visible:outline-brand-action";

/** "View all →" link. */
export function ViewAll({ href, label = "View all" }: { href: string; label?: string }) {
  return (
    <Link href={href} className={viewAllClass}>
      {label}
      <ArrowRightIcon size={13} weight="bold" aria-hidden />
    </Link>
  );
}

// ── Badges ───────────────────────────────────────────────────────────

/** Soft rounded label with an optional leading dot. */
export function Badge({ fg, bg, dot, children, className }: { fg: string; bg: string; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] leading-[18px] font-medium whitespace-nowrap", className)} style={{ color: fg, backgroundColor: bg }}>
      {dot && <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: fg }} aria-hidden />}
      {children}
    </span>
  );
}

export function ToneBadge({ tone, className }: { tone: Tone; className?: string }) {
  return (
    <Badge fg={tone.fg} bg={tone.bg} dot={tone.dot} className={className}>
      {tone.label}
    </Badge>
  );
}

/** In Stock / Low Stock / Out of Stock / Inactive / Archived — always text, never colour alone. */
export function StatusBadge({ status, className }: { status: DisplayStatus; className?: string }) {
  return <ToneBadge tone={STATUS_META[status]} className={className} />;
}

// ── Buttons ──────────────────────────────────────────────────────────

type ButtonProps = ComponentProps<"button"> & { icon?: Icon };

export function PrimaryButton({ children, icon: IconCmp, className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-button whitespace-nowrap text-white shadow-[0_1px_2px_rgb(125_17_73/0.2)] transition-colors hover:bg-brand-press disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action",
        className,
      )}
      {...props}
    >
      {IconCmp && <IconCmp size={16} weight="bold" aria-hidden />}
      {children}
    </button>
  );
}

export function OutlineButton({ children, icon: IconCmp, className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3.5 text-button-sm whitespace-nowrap text-ink-body transition-colors hover:border-[#D0D5DD] hover:bg-[#F9FAFB] hover:text-ink disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action data-[state=open]:bg-[#F9FAFB] aria-pressed:border-brand-soft aria-pressed:bg-brand-surface aria-pressed:text-brand",
        className,
      )}
      {...props}
    >
      {IconCmp && <IconCmp size={16} aria-hidden />}
      {children}
    </button>
  );
}

/** Borderless square icon button ("⋯" menus, header tools). */
export function IconButton({ children, className, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-brand-depth-10 hover:text-ink disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-brand-action data-[state=open]:bg-brand-depth-10 data-[state=open]:text-ink",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Explains why a control is unavailable. Disabled buttons don't receive
 * pointer or focus events, so the tooltip sits on a focusable wrapper.
 */
export function UnavailableTip({ reason, children, className }: { reason: string; children: ReactElement; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className={cn("inline-flex rounded-lg focus-visible:outline-2 focus-visible:outline-brand-action", className)} aria-label={reason}>
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  );
}

/** Small "Soon" tag for menu items whose module isn't built yet. */
export function SoonTag() {
  return <span className="ml-auto rounded-full bg-[#F2F4F7] px-1.5 text-[10.5px] leading-[18px] font-medium text-ink-muted">Soon</span>;
}

// ── Tabs ─────────────────────────────────────────────────────────────

/** Underlined tab strip; scrolls sideways on narrow screens. */
export function UnderlineTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  idPrefix,
  className,
}: {
  tabs: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  /** Tabs point at panels with id `${idPrefix}-panel-${value}`. */
  idPrefix: string;
  className?: string;
}) {
  const move = (dir: 1 | -1) => {
    const i = tabs.findIndex((t) => t.value === value);
    const next = tabs[(i + dir + tabs.length) % tabs.length];
    onChange(next.value);
    requestAnimationFrame(() => document.getElementById(`${idPrefix}-tab-${next.value}`)?.focus());
  };
  return (
    <div role="tablist" aria-label={label} className={cn("flex gap-6 overflow-x-auto border-b border-line scrollbar-none", className)}>
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            id={`${idPrefix}-tab-${t.value}`}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={`${idPrefix}-panel-${t.value}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") move(1);
              if (e.key === "ArrowLeft") move(-1);
            }}
            className={cn(
              "relative flex shrink-0 items-center gap-1.5 pt-1 pb-3 text-[13.5px] leading-5 whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-action",
              active ? "font-medium text-brand" : "text-ink-body hover:text-ink",
            )}
          >
            {t.label}
            {t.count !== undefined && <span className={cn("rounded-full px-1.5 text-[11px] leading-[18px] tabular-nums", active ? "bg-brand-tint text-brand" : "bg-[#F2F4F7] text-ink-muted")}>{t.count}</span>}
            {active && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}

// ── Search & filters ─────────────────────────────────────────────────

/** Outlined input / select styling shared by every form and filter. */
export const fieldClass =
  "h-9 w-full rounded-lg border border-line bg-white px-3 text-[13px] text-ink outline-none shadow-none transition-colors placeholder:text-ink-faint hover:border-[#D0D5DD] focus:border-brand-hover focus:ring-3 focus:ring-brand-10 focus-visible:border-brand-hover focus-visible:ring-3 focus-visible:ring-brand-10 aria-invalid:border-[#DC2626] aria-invalid:ring-[#DC2626]/10 data-[state=open]:border-brand-hover disabled:opacity-60";

/** Search box that types locally and reports the value after a short pause. */
export function SearchInput({ value, onChange, placeholder, label, className }: { value: string; onChange: (q: string) => void; placeholder: string; label: string; className?: string }) {
  const [draft, setDraft] = useState(value);
  const [synced, setSynced] = useState(value);
  // The value changed from elsewhere (header search, Back, Clear filters): show it.
  if (value !== synced) {
    setSynced(value);
    setDraft(value);
  }
  useEffect(() => {
    if (draft === value) return;
    const t = setTimeout(() => onChange(draft), 250);
    return () => clearTimeout(t);
  }, [draft, value, onChange]);

  return (
    <div className={cn("relative min-w-0", className)}>
      <MagnifyingGlassIcon size={15} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted" />
      <input
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onChange(draft)}
        placeholder={placeholder}
        aria-label={label}
        className={cn(fieldClass, "pl-8.5")}
      />
    </div>
  );
}

/** Compact select used in filter rows. An empty value maps to the "any" option. */
export function FilterSelect({
  value,
  onChange,
  options,
  label,
  allLabel,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label: string;
  allLabel: string;
  className?: string;
}) {
  const ANY = "__any";
  return (
    <Select value={value || ANY} onValueChange={(v) => onChange(v === ANY ? "" : v)}>
      <SelectTrigger aria-label={label} className={cn(fieldClass, "w-full gap-2 text-ink-body", value && "border-brand-soft bg-brand-surface text-ink", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="start" className="max-h-72">
        <SelectItem value={ANY}>{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ── Forms ────────────────────────────────────────────────────────────

/** Label above the control, error (or hint) below. */
export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid min-w-0 content-start gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-field-label text-ink-body">
        {label}
        {required && (
          <span className="ml-0.5 text-[#DC2626]" aria-hidden>
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-[12px] leading-4 font-medium text-[#DC2626]">
          {error}
        </p>
      ) : (
        hint && <p className="text-[12px] leading-4 text-ink-muted">{hint}</p>
      )}
    </div>
  );
}

/** A select bound to a form field. */
export function SelectField({
  id,
  value,
  onChange,
  options,
  placeholder,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  invalid?: boolean;
}) {
  return (
    // Always controlled: an empty string shows the placeholder.
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} aria-invalid={invalid || undefined} aria-describedby={invalid ? `${id}-error` : undefined} className={cn(fieldClass, "justify-between")}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper" className="max-h-72">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** "Are you sure?" for destructive or significant actions. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  pending,
  destructive = true,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  pending?: boolean;
  destructive?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogTitle className="pr-6 text-[17px] font-semibold text-ink">{title}</DialogTitle>
        <DialogDescription asChild>
          <div className="text-[14px] leading-[22px] text-ink-muted">{description}</div>
        </DialogDescription>
        <DialogFooter className="mt-2 gap-2">
          <OutlineButton onClick={() => onOpenChange(false)}>Cancel</OutlineButton>
          <PrimaryButton className={cn(destructive && "bg-[#D92D20] shadow-none hover:bg-[#B42318]")} onClick={onConfirm} disabled={pending}>
            {pending ? "Working…" : confirmLabel}
          </PrimaryButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Lists ────────────────────────────────────────────────────────────

/** Page numbers with gaps: 1 … 4 5 6 … 12 */
function pageList(page: number, count: number): (number | "gap")[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const set = new Set([1, count, page - 1, page, page + 1].filter((p) => p >= 1 && p <= count));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1] > 1) out.push("gap");
    out.push(p);
  });
  return out;
}

/** "1–10 of 23 items", rows-per-page, previous / next and page numbers. */
export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  pageSizes,
  noun,
  onPage,
  onPageSize,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  pageSizes?: readonly number[];
  noun: string;
  onPage: (p: number) => void;
  onPageSize?: (s: number) => void;
}) {
  if (total === 0) return null;
  const btn =
    "inline-flex size-8 items-center justify-center rounded-lg border border-line bg-white text-ink-body transition-colors hover:border-[#D0D5DD] hover:text-ink disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-brand-action";
  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <div className="flex items-center gap-4">
        <p className="text-[13px] text-ink-muted tabular-nums" aria-live="polite">
          {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total} {noun}
        </p>
        {pageSizes && onPageSize && (
          <label className="hidden items-center gap-2 text-[13px] text-ink-muted sm:flex">
            Rows per page
            <Select value={String(pageSize)} onValueChange={(v) => onPageSize(Number(v))}>
              <SelectTrigger aria-label="Rows per page" className={cn(fieldClass, "h-8 w-[72px] gap-1 px-2.5")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {pageSizes.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        )}
      </div>
      {pageCount > 1 && (
        <nav aria-label="Pagination" className="flex items-center gap-1.5">
          <button type="button" aria-label="Previous page" disabled={page === 1} onClick={() => onPage(page - 1)} className={btn}>
            <CaretLeftIcon size={14} weight="bold" aria-hidden />
          </button>
          {pageList(page, pageCount).map((p, i) =>
            p === "gap" ? (
              <span key={`gap-${i}`} className="px-1 text-[13px] text-ink-faint" aria-hidden>
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPage(p)}
                aria-label={`Page ${p}`}
                aria-current={p === page ? "page" : undefined}
                className={cn(
                  "size-8 rounded-lg border text-button-sm tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-brand-action",
                  p === page ? "border-brand-soft bg-brand-surface text-brand" : "border-line bg-white text-ink-body hover:border-[#D0D5DD]",
                )}
              >
                {p}
              </button>
            ),
          )}
          <button type="button" aria-label="Next page" disabled={page === pageCount} onClick={() => onPage(page + 1)} className={btn}>
            <CaretRightIcon size={14} weight="bold" aria-hidden />
          </button>
        </nav>
      )}
    </div>
  );
}

/** Table cell classes shared by every compact table. */
export const th = "px-3 py-2.5 text-left text-table-header whitespace-nowrap text-ink-muted first:pl-5 last:pr-5";
export const td = "px-3 py-3 align-middle text-[13px] leading-5 text-ink-body first:pl-5 last:pr-5";
