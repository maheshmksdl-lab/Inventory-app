"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircleIcon, CircleNotchIcon, EyeIcon, EyeSlashIcon, FlaskIcon, WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { LOGO_SRC } from "@/components/layout/app-logo";
import { fieldClass } from "@/components/shared/inventory-ui";
import { cn } from "@/lib/utils";

/**
 * Building blocks for the sign-in screens. These are frontend prototypes:
 * nothing is sent anywhere, and passwords only ever live in component state.
 */

export function AuthCard({ title, description, children, footer }: { title: string; description: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="w-full max-w-[420px]">
      <Link href="/login" className="mb-8 inline-flex rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action" aria-label="EVOQ Inventory">
        <Image src={LOGO_SRC} alt="EVOQ Inventory" width={176} height={48} priority className="h-11 w-auto" unoptimized />
      </Link>
      <div className="rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">
        <h1 className="text-[24px] leading-8 font-semibold tracking-[-0.01em] text-ink">{title}</h1>
        <p className="mt-1 text-[14px] leading-[22px] text-ink-muted">{description}</p>
        <div className="mt-6">{children}</div>
      </div>
      {footer && <div className="mt-5 text-center text-[13.5px] text-ink-body">{footer}</div>}
      <p className="mt-6 flex items-start justify-center gap-1.5 text-center text-[12px] leading-4 text-ink-muted">
        <FlaskIcon size={14} aria-hidden className="mt-px shrink-0" />
        Frontend prototype — there is no real sign-in, and nothing you type is sent or stored.
      </p>
    </div>
  );
}

export function AuthField({ id, label, error, hint, children, aside }: { id: string; label: string; error?: string; hint?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-field-label text-ink-body">
          {label}
        </label>
        {aside}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="flex items-center gap-1 text-[12px] leading-4 font-medium text-[#DC2626]">
          <WarningCircleIcon size={13} aria-hidden /> {error}
        </p>
      ) : (
        hint && <div className="text-[12px] leading-4 text-ink-muted">{hint}</div>
      )}
    </div>
  );
}

export function AuthInput({ invalid, className, id, ...props }: ComponentProps<"input"> & { invalid?: boolean }) {
  return <input id={id} aria-invalid={invalid || undefined} aria-describedby={invalid ? `${id}-error` : undefined} className={cn(fieldClass, "h-11 text-[14px]", className)} {...props} />;
}

/** Password input with a show / hide toggle. */
export function PasswordInput({ id, invalid, ...props }: ComponentProps<"input"> & { invalid?: boolean }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <AuthInput id={id} type={shown ? "text" : "password"} invalid={invalid} className="pr-11" {...props} />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? "Hide password" : "Show password"}
        aria-pressed={shown}
        aria-controls={id}
        className="absolute top-1/2 right-1.5 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-brand-depth-10 hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-action"
      >
        {shown ? <EyeSlashIcon size={18} aria-hidden /> : <EyeIcon size={18} aria-hidden />}
      </button>
    </div>
  );
}

export function SubmitButton({ loading, children, loadingLabel }: { loading: boolean; children: ReactNode; loadingLabel: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      aria-busy={loading}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 text-[14.5px] font-medium text-white shadow-[0_1px_2px_rgb(125_17_73/0.2)] transition-colors hover:bg-brand-press disabled:cursor-progress disabled:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action"
    >
      {loading && <CircleNotchIcon size={18} aria-hidden className="animate-spin" />}
      {loading ? loadingLabel : children}
    </button>
  );
}

export function AuthAlert({ tone, title, children }: { tone: "error" | "info" | "success"; title: string; children?: ReactNode }) {
  const styles = {
    error: "border-[#FECDCA] bg-[var(--danger-bg)] text-[var(--danger)]",
    info: "border-line bg-[#F9FAFB] text-ink",
    success: "border-[#ABEFC6] bg-[var(--success-bg)] text-[var(--success)]",
  }[tone];
  const IconCmp = tone === "error" ? WarningCircleIcon : tone === "success" ? CheckCircleIcon : FlaskIcon;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex gap-2.5 rounded-xl border px-3.5 py-3 text-[13px] leading-5", styles)}>
      <IconCmp size={18} aria-hidden className="mt-px shrink-0" />
      <div>
        <p className="font-semibold">{title}</p>
        {children && <div className="mt-0.5 text-ink-body">{children}</div>}
      </div>
    </div>
  );
}

export const authLink = "rounded font-medium text-brand hover:text-brand-press hover:underline focus-visible:outline-2 focus-visible:outline-brand-action";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Checks shown live under new-password fields. */
export const PASSWORD_RULES: { label: string; test: (p: string) => boolean }[] = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "A letter and a number", test: (p) => /[A-Za-z]/.test(p) && /\d/.test(p) },
  { label: "An uppercase letter", test: (p) => /[A-Z]/.test(p) },
];

export function PasswordRules({ value }: { value: string }) {
  return (
    <ul className="mt-1 grid gap-1" aria-label="Password requirements">
      {PASSWORD_RULES.map((r) => {
        const ok = r.test(value);
        return (
          <li key={r.label} className={cn("flex items-center gap-1.5 text-[12px] leading-4", ok ? "text-[var(--success)]" : "text-ink-muted")}>
            <CheckCircleIcon size={13} weight={ok ? "fill" : "regular"} aria-hidden />
            {r.label}
            <span className="sr-only">{ok ? " — met" : " — not met"}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Simulated round trip so loading states are visible. */
export const simulate = (ms = 900) => new Promise((r) => setTimeout(r, ms));
