import type { ReactNode } from "react";
import Link from "next/link";
import type { Icon } from "@phosphor-icons/react";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Icon tile tones: pink and coral are the brand accents; neutral for everything else. */
const TONES = {
  brand: "bg-inventory-surface text-inventory",
  coral: "bg-coral-10 text-[#D9443F]",
  neutral: "bg-[#F2F4F7] text-[#475467]",
} as const;

export type KpiTone = keyof typeof TONES;

/**
 * Compact metric card: tinted icon, label, value and a short factual note.
 * With `href` the whole card is a link to the matching filtered list.
 */
export function KpiCard({ icon: IconCmp, label, value, note, tone = "brand", href, loading }: { icon: Icon; label: string; value: ReactNode; note?: ReactNode; tone?: KpiTone; href?: string; loading?: boolean }) {
  const body = (
    <>
      <span className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-full", TONES[tone])} aria-hidden>
        <IconCmp size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] leading-5 font-medium text-ink-body">{label}</span>
        {loading ? (
          <>
            <Skeleton className="mt-1.5 h-6 w-24" />
            <Skeleton className="mt-2 h-3 w-32" />
          </>
        ) : (
          <>
            <span className="mt-0.5 block truncate text-[22px] leading-8 font-semibold tracking-[-0.01em] text-ink tabular-nums">{value}</span>
            {note && <span className="block truncate text-[12px] leading-4 text-ink-muted">{note}</span>}
          </>
        )}
      </span>
      {href && <CaretRightIcon size={14} weight="bold" aria-hidden className="mt-1 shrink-0 text-ink-faint transition-colors group-hover:text-brand" />}
    </>
  );
  const cls = "flex min-w-0 items-start gap-3.5 rounded-xl border border-line bg-card p-4 shadow-card";
  if (href) {
    return (
      <Link href={href} className={cn(cls, "group transition-colors hover:border-brand-soft hover:bg-brand-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action")}>
        {body}
      </Link>
    );
  }
  return <div className={cls}>{body}</div>;
}
