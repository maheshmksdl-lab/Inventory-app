"use client";

import { useState, type ComponentProps, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { fieldClass, FormField, OutlineButton, PrimaryButton, SelectField } from "@/components/shared/inventory-ui";
import { ApiError } from "@/lib/api/inventory";
import { cn } from "@/lib/utils";

/**
 * Small form state helper used by every create / edit form: values, zod
 * validation (live after the first submit), focus on the first invalid field
 * and server-style field errors from the mock API.
 */
type Issue = { path: PropertyKey[]; message: string };
interface Validator {
  safeParse(v: unknown): { success: true } | { success: false; error: { issues: Issue[] } };
}

export type FormErrors<V> = Partial<Record<keyof V & string, string>>;

export interface FormApi<V extends Record<string, unknown>> {
  values: V;
  errors: FormErrors<V>;
  saving: boolean;
  dirty: boolean;
  id: (key: keyof V & string) => string;
  set: <K extends keyof V & string>(key: K, v: V[K]) => void;
  setValues: (v: V) => void;
  handleSubmit: (onValid: (v: V) => Promise<unknown> | unknown) => (e?: FormEvent) => void;
}

export function useZodForm<V extends Record<string, unknown>>(schema: Validator, initial: V, idPrefix: string, extraCheck?: (v: V) => FormErrors<V>): FormApi<V> {
  const [values, setValuesState] = useState<V>(initial);
  const [errors, setErrors] = useState<FormErrors<V>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const id = (key: string) => `${idPrefix}-${key}`;

  const validate = (v: V): FormErrors<V> => {
    const out: FormErrors<V> = {};
    const r = schema.safeParse(v);
    if (!r.success) {
      for (const issue of r.error.issues) {
        const k = String(issue.path[0]) as keyof V & string;
        if (!out[k]) out[k] = issue.message;
      }
    }
    return { ...extraCheck?.(v), ...out };
  };

  const setValues = (next: V) => {
    setValuesState(next);
    if (submitted) setErrors(validate(next));
  };

  const focusFirst = (errs: FormErrors<V>) => {
    const first = Object.keys(values).find((k) => errs[k as keyof V & string]) ?? Object.keys(errs)[0];
    if (first) requestAnimationFrame(() => document.getElementById(id(first))?.focus());
  };

  return {
    values,
    errors,
    saving,
    dirty: JSON.stringify(values) !== JSON.stringify(initial),
    id,
    set: (key, v) => setValues({ ...values, [key]: v }),
    setValues,
    handleSubmit: (onValid) => (e) => {
      e?.preventDefault();
      setSubmitted(true);
      const errs = validate(values);
      setErrors(errs);
      const n = Object.keys(errs).length;
      if (n) {
        focusFirst(errs);
        toast.error("Check the highlighted fields", { id: `${idPrefix}-validation`, description: `${n} field${n === 1 ? " needs" : "s need"} attention.` });
        return;
      }
      toast.dismiss(`${idPrefix}-validation`);
      setSaving(true);
      Promise.resolve(onValid(values))
        .catch((err: unknown) => {
          if (err instanceof ApiError && err.field) {
            const fe = { [err.field]: err.message } as FormErrors<V>;
            setErrors(fe);
            focusFirst(fe);
          } else toast.error("Couldn't save", { description: err instanceof Error ? err.message : "Please try again." });
        })
        .finally(() => setSaving(false));
    },
  };
}

type Keyed<V extends Record<string, unknown>> = { form: FormApi<V>; name: keyof V & string; label: string; required?: boolean; hint?: ReactNode; className?: string };

export function TextField<V extends Record<string, unknown>>({ form, name, label, required, hint, className, inputClassName, ...rest }: Keyed<V> & Omit<ComponentProps<"input">, "form" | "name" | "value" | "onChange"> & { inputClassName?: string }) {
  const err = form.errors[name];
  return (
    <FormField label={label} htmlFor={form.id(name)} error={err} hint={hint} required={required} className={className}>
      <input
        id={form.id(name)}
        value={String(form.values[name] ?? "")}
        onChange={(e) => form.set(name, e.target.value as V[typeof name])}
        aria-invalid={err ? true : undefined}
        aria-describedby={err ? `${form.id(name)}-error` : undefined}
        aria-required={required || undefined}
        className={cn(fieldClass, inputClassName)}
        {...rest}
      />
    </FormField>
  );
}

export function TextAreaField<V extends Record<string, unknown>>({ form, name, label, required, hint, className, rows = 3, placeholder, maxLength = 600 }: Keyed<V> & { rows?: number; placeholder?: string; maxLength?: number }) {
  const err = form.errors[name];
  return (
    <FormField label={label} htmlFor={form.id(name)} error={err} hint={hint} required={required} className={className}>
      <textarea
        id={form.id(name)}
        value={String(form.values[name] ?? "")}
        onChange={(e) => form.set(name, e.target.value as V[typeof name])}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-invalid={err ? true : undefined}
        aria-describedby={err ? `${form.id(name)}-error` : undefined}
        className={cn(fieldClass, "h-auto min-h-[76px] resize-y py-2 leading-5")}
      />
    </FormField>
  );
}

export function ChoiceField<V extends Record<string, unknown>>({ form, name, label, required, hint, className, options, placeholder }: Keyed<V> & { options: { value: string; label: string }[]; placeholder?: string }) {
  const err = form.errors[name];
  return (
    <FormField label={label} htmlFor={form.id(name)} error={err} hint={hint} required={required} className={className}>
      <SelectField id={form.id(name)} value={String(form.values[name] ?? "")} onChange={(v) => form.set(name, v as V[typeof name])} options={options} placeholder={placeholder ?? "Choose…"} invalid={!!err} />
    </FormField>
  );
}

/** Modal form: header, scrollable body, Cancel / Save footer. */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSubmit,
  submitLabel,
  saving,
  wide,
  note,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  onSubmit: (e: FormEvent) => void;
  submitLabel: string;
  saving?: boolean;
  wide?: boolean;
  note?: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("flex max-h-[min(720px,calc(100dvh-2rem))] flex-col gap-0 overflow-hidden p-0", wide ? "sm:max-w-2xl" : "sm:max-w-lg")}>
        <div className="border-b border-line-soft px-5 pt-5 pb-4">
          <DialogTitle className="pr-8 text-[17px] font-semibold text-ink">{title}</DialogTitle>
          {description && <DialogDescription className="mt-1 text-[13px] leading-5 text-ink-muted">{description}</DialogDescription>}
        </div>
        <form noValidate onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-5 py-4 scrollbar-thin sm:grid-cols-2">{children}</div>
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line-soft bg-[#FAFAFB] px-5 py-3">
            {note && <p className="mr-auto text-[12px] leading-4 text-ink-muted">{note}</p>}
            <OutlineButton onClick={() => onOpenChange(false)}>Cancel</OutlineButton>
            <PrimaryButton type="submit" disabled={saving}>
              {saving ? "Saving…" : submitLabel}
            </PrimaryButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Bottom action bar for full-page forms (same placement as the item form). */
export function StickyActions({ children, note }: { children: ReactNode; note?: ReactNode }) {
  return (
    <div className="fixed right-0 bottom-0 left-0 z-20 border-t border-line bg-white/95 backdrop-blur lg:left-[var(--sidebar-w)] lg:group-data-[sidebar=collapsed]/shell:left-[var(--sidebar-w-collapsed)]">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-end gap-2 px-4 py-3 sm:px-6 lg:px-8">
        {note && <span className="mr-auto hidden text-[12.5px] text-ink-muted sm:block">{note}</span>}
        {children}
      </div>
    </div>
  );
}

/** Titled section card on full-page forms. */
export function FormSection({ title, description, children, flush }: { title: string; description?: string; children: ReactNode; flush?: boolean }) {
  return (
    <section className="min-w-0 rounded-xl border border-line bg-card shadow-card">
      <header className="px-5 pt-4 pb-3">
        <h2 className="text-[15px] leading-6 font-semibold text-ink">{title}</h2>
        {description && <p className="text-[12.5px] leading-5 text-ink-muted">{description}</p>}
      </header>
      {flush ? children : <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-3">{children}</div>}
    </section>
  );
}

/** Standard "saved in this tab only" suffix for toasts. */
export const SESSION_NOTE = "Saved in this browser tab only — not sent to a server.";
