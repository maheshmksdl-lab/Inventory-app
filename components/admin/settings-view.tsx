"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import type { Icon } from "@phosphor-icons/react";
import {
  BellIcon,
  BuildingsIcon,
  CodeIcon,
  CurrencyInrIcon,
  HashIcon,
  PackageIcon,
  PlugsConnectedIcon,
  PlusIcon,
  RulerIcon,
  UserCircleIcon,
  WarehouseIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";
import { PrototypeNote } from "@/components/shared/doc-ui";
import { TextAreaField, TextField, useZodForm } from "@/components/shared/form-kit";
import { Card, fieldClass, FormField, OutlineButton, PageHeading, PageShell, PrimaryButton, SelectField, UnavailableTip } from "@/components/shared/inventory-ui";
import { useProducts, useRecords, useSaveSettings, useSettings } from "@/hooks/use-operations";
import { ROUTES } from "@/lib/routes";
import type { AppSettings } from "@/lib/types/operations";
import { cn } from "@/lib/utils";

const SECTIONS: { id: string; label: string; icon: Icon }[] = [
  { id: "organisation", label: "Organisation Profile", icon: BuildingsIcon },
  { id: "inventory", label: "Inventory Preferences", icon: PackageIcon },
  { id: "warehouses", label: "Warehouses", icon: WarehouseIcon },
  { id: "units", label: "Units of Measurement", icon: RulerIcon },
  { id: "numbering", label: "SKU & Document Numbering", icon: HashIcon },
  { id: "currency", label: "Currency & Number Formats", icon: CurrencyInrIcon },
  { id: "notifications", label: "Notifications", icon: BellIcon },
  { id: "preferences", label: "User Preferences", icon: UserCircleIcon },
  { id: "integrations", label: "Integrations", icon: PlugsConnectedIcon },
  { id: "api", label: "API Settings", icon: CodeIcon },
];

const SAVED = "Saved for this browser tab only — nothing is sent to a server.";

function Section({ title, description, children, footer }: { title: string; description: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <Card>
      <header className="border-b border-line-soft px-5 pt-4 pb-3">
        <h2 className="text-[16px] leading-6 font-semibold text-ink">{title}</h2>
        <p className="text-[13px] leading-5 text-ink-muted">{description}</p>
      </header>
      <div className="px-5 py-5">{children}</div>
      {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line-soft bg-[#FAFAFB] px-5 py-3">{footer}</div>}
    </Card>
  );
}

function Toggle({ checked, onChange, label, hint, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <span>
        <span className="block text-[13.5px] leading-5 font-medium text-ink">{label}</span>
        {hint && <span className="block text-[12.5px] leading-5 text-ink-muted">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn("relative mt-0.5 inline-flex h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action disabled:opacity-50", checked ? "bg-brand" : "bg-[#D0D5DD]")}
      >
        <span className={cn("absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform", checked ? "translate-x-[18px]" : "translate-x-0.5")} />
      </button>
    </div>
  );
}

/** Each section edits a draft copy and saves the whole settings object. */
function useDraft(settings: AppSettings) {
  const save = useSaveSettings();
  const [draft, setDraft] = useState(settings);
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);
  const commit = async (next = draft, title = "Settings saved") => {
    await save.mutateAsync(next);
    toast.success(title, { description: SAVED });
  };
  const footer = (
    <>
      <OutlineButton disabled={!dirty} onClick={() => setDraft(settings)}>
        Discard
      </OutlineButton>
      <PrimaryButton disabled={!dirty || save.isPending} onClick={() => void commit()}>
        {save.isPending ? "Saving…" : "Save changes"}
      </PrimaryButton>
    </>
  );
  return { draft, setDraft, footer, commit };
}

const orgSchema = z.object({
  orgName: z.string().trim().min(2, "Enter the organisation name"),
  legalName: z.string().trim().min(2, "Enter the legal name"),
  gstin: z
    .string()
    .trim()
    .refine((v) => v === "" || /^[0-9]{2}[A-Z0-9]{13}$/i.test(v), "GSTIN is 15 characters"),
  email: z.email("Enter a valid email"),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s-]{6,}$/, "Enter a valid phone number"),
  address: z.string().trim().min(5, "Enter the address"),
});
type OrgValues = z.input<typeof orgSchema>;

function OrganisationSection({ settings }: { settings: AppSettings }) {
  const save = useSaveSettings();
  const form = useZodForm<OrgValues>(orgSchema, { orgName: settings.orgName, legalName: settings.legalName, gstin: settings.gstin, email: settings.email, phone: settings.phone, address: settings.address }, "org");
  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(async (v) => {
        await save.mutateAsync({ ...settings, ...v, gstin: v.gstin.toUpperCase() });
        toast.success("Organisation profile saved", { description: SAVED });
      })}
    >
      <Section
        title="Organisation Profile"
        description="How your organisation appears on documents."
        footer={
          <PrimaryButton type="submit" disabled={!form.dirty || form.saving}>
            {form.saving ? "Saving…" : "Save changes"}
          </PrimaryButton>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField form={form} name="orgName" label="Organisation name" required />
          <TextField form={form} name="legalName" label="Legal name" required />
          <TextField form={form} name="gstin" label="GSTIN" inputClassName="font-mono uppercase" />
          <TextField form={form} name="email" label="Contact email" required type="email" />
          <TextField form={form} name="phone" label="Phone" required />
          <TextAreaField form={form} name="address" label="Registered address" required rows={2} className="sm:col-span-2" />
        </div>
      </Section>
    </form>
  );
}

function SettingsBody({ section, settings }: { section: string; settings: AppSettings }) {
  const { draft, setDraft, footer, commit } = useDraft(settings);
  const { data: warehouses } = useRecords("warehouses");
  const { data: products } = useProducts();
  const [unit, setUnit] = useState("");
  const set = <K extends keyof AppSettings>(k: K, v: AppSettings[K]) => setDraft({ ...draft, [k]: v });

  switch (section) {
    case "inventory":
      return (
        <Section title="Inventory Preferences" description="Rules used when stock is valued and reordered." footer={footer}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Costing method (display)" htmlFor="set-costing" hint="Shown as a preference only. Inventory Valuation uses its own illustrative cost bases.">
              <SelectField
                id="set-costing"
                value={draft.costingMethod}
                onChange={(v) => set("costingMethod", v as AppSettings["costingMethod"])}
                options={[
                  { value: "weighted-average", label: "Weighted average" },
                  { value: "fifo", label: "FIFO" },
                  { value: "standard", label: "Standard cost" },
                ]}
              />
            </FormField>
            <FormField label="Reorder suggestion" htmlFor="set-reorder" hint="Used by Reorder Alerts and the Low / Out of Stock reports.">
              <SelectField
                id="set-reorder"
                value={draft.reorderSuggestion}
                onChange={(v) => set("reorderSuggestion", v as AppSettings["reorderSuggestion"])}
                options={[
                  { value: "double-reorder-point", label: "Order up to 2 × reorder point" },
                  { value: "to-reorder-point", label: "Order up to the reorder point" },
                ]}
              />
            </FormField>
          </div>
          <div className="mt-2 divide-y divide-line-soft">
            <Toggle checked={draft.allowNegativeStock} onChange={(v) => set("allowNegativeStock", v)} label="Allow negative stock" hint="Preference only — this prototype never changes stock balances." />
          </div>
        </Section>
      );
    case "warehouses":
      return (
        <Section title="Warehouses" description="The warehouse used by default on new documents." footer={footer}>
          <FormField label="Default warehouse" htmlFor="set-default-wh">
            <SelectField id="set-default-wh" value={draft.defaultWarehouse} onChange={(v) => set("defaultWarehouse", v)} options={(warehouses ?? []).filter((w) => w.status === "active").map((w) => ({ value: w.id, label: w.name }))} />
          </FormField>
          <ul className="mt-4 divide-y divide-line-soft rounded-lg border border-line">
            {(warehouses ?? []).map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-[13px]">
                <span>
                  <span className="font-medium text-ink">{w.name}</span> <span className="font-mono text-[12px] text-ink-muted">{w.code}</span>
                </span>
                <span className="text-ink-muted">{w.status === "active" ? w.city : "Inactive"}</span>
              </li>
            ))}
          </ul>
          <Link href={ROUTES.warehouses} className="mt-3 inline-block rounded text-[13px] font-medium text-brand hover:text-brand-press focus-visible:outline-2 focus-visible:outline-brand-action">
            Manage warehouses →
          </Link>
        </Section>
      );
    case "units": {
      const used = new Set((products ?? []).map((p) => p.unit));
      const add = () => {
        const u = unit.trim().toLowerCase();
        if (!u) return;
        if (!/^[a-z][a-z0-9 .]{0,11}$/.test(u)) return toast.error("Use up to 12 letters or digits");
        if (draft.units.includes(u)) return toast.error(`“${u}” already exists`);
        set("units", [...draft.units, u]);
        setUnit("");
      };
      return (
        <Section title="Units of Measurement" description="Units offered on the item form." footer={footer}>
          <ul className="flex flex-wrap gap-2" aria-label="Units">
            {draft.units.map((u) => (
              <li key={u} className="inline-flex items-center gap-1 rounded-full border border-line bg-white py-1 pr-1 pl-3 text-[13px] text-ink">
                {u}
                <button
                  type="button"
                  disabled={used.has(u)}
                  title={used.has(u) ? "In use by items" : `Remove ${u}`}
                  aria-label={used.has(u) ? `${u} is in use by items` : `Remove ${u}`}
                  onClick={() => set("units", draft.units.filter((x) => x !== u))}
                  className="inline-flex size-5 items-center justify-center rounded-full text-ink-muted hover:bg-brand-depth-10 hover:text-ink disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-brand-action"
                >
                  <XIcon size={11} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex max-w-sm gap-2">
            <input value={unit} onChange={(e) => setUnit(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} placeholder="e.g. kg, roll, carton" aria-label="New unit" className={fieldClass} />
            <OutlineButton icon={PlusIcon} onClick={add}>
              Add
            </OutlineButton>
          </div>
          <p className="mt-2 text-[12px] text-ink-muted">Units used by existing items can&apos;t be removed.</p>
        </Section>
      );
    }
    case "numbering": {
      const labels: Record<keyof AppSettings["numbering"], string> = { po: "Purchase orders", so: "Sales orders", grn: "Goods receipts", trf: "Stock transfers", adj: "Stock adjustments", bill: "Supplier bills", rma: "Sales returns", stk: "Stocktakes" };
      const bad = Object.values(draft.numbering).some((p) => !/^[A-Z][A-Z0-9]{0,5}-?$/.test(p));
      return (
        <Section
          title="SKU & Document Numbering"
          description="Prefixes for new documents. Existing numbers don't change."
          footer={
            <>
              {bad && <span className="mr-auto text-[12px] font-medium text-[#DC2626]">Prefixes: 1–6 capital letters or digits, optional trailing hyphen.</span>}
              <OutlineButton onClick={() => setDraft(settings)}>Discard</OutlineButton>
              <PrimaryButton disabled={bad || JSON.stringify(draft) === JSON.stringify(settings)} onClick={() => void commit(draft, "Numbering saved")}>
                Save changes
              </PrimaryButton>
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(Object.keys(labels) as (keyof typeof labels)[]).map((k) => (
              <FormField key={k} label={labels[k]} htmlFor={`num-${k}`} hint={`Next: ${draft.numbering[k]}…`}>
                <input id={`num-${k}`} value={draft.numbering[k]} onChange={(e) => set("numbering", { ...draft.numbering, [k]: e.target.value.toUpperCase() })} className={cn(fieldClass, "font-mono uppercase")} maxLength={7} />
              </FormField>
            ))}
          </div>
          <FormField label="SKU pattern (suggestion)" htmlFor="num-sku" className="mt-4 max-w-sm" hint="Tokens: {CATEGORY}, {BRAND}, {SEQ}. Shown as guidance; SKUs are typed on the item form.">
            <input id="num-sku" value={draft.skuPattern} onChange={(e) => set("skuPattern", e.target.value)} className={cn(fieldClass, "font-mono")} />
          </FormField>
        </Section>
      );
    }
    case "currency": {
      const sample = 1234567.891;
      let money = "—";
      let num = "—";
      try {
        money = new Intl.NumberFormat(draft.locale, { style: "currency", currency: draft.currency }).format(sample);
        num = new Intl.NumberFormat(draft.locale).format(sample);
      } catch {
        /* invalid combination: leave the dashes */
      }
      return (
        <Section title="Currency & Number Formats" description="How amounts, numbers and dates are displayed." footer={footer}>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Currency" htmlFor="cur-currency">
              <SelectField
                id="cur-currency"
                value={draft.currency}
                onChange={(v) => set("currency", v)}
                options={["INR", "USD", "EUR", "GBP", "AED", "SGD"].map((c) => ({ value: c, label: c }))}
              />
            </FormField>
            <FormField label="Number format" htmlFor="cur-locale">
              <SelectField
                id="cur-locale"
                value={draft.locale}
                onChange={(v) => set("locale", v)}
                options={[
                  { value: "en-IN", label: "Indian (12,34,567.89)" },
                  { value: "en-US", label: "International (1,234,567.89)" },
                  { value: "de-DE", label: "European (1.234.567,89)" },
                ]}
              />
            </FormField>
            <FormField label="Date format" htmlFor="cur-date">
              <SelectField
                id="cur-date"
                value={draft.dateFormat}
                onChange={(v) => set("dateFormat", v as AppSettings["dateFormat"])}
                options={["MMM D, YYYY", "DD/MM/YYYY", "YYYY-MM-DD"].map((d) => ({ value: d, label: d }))}
              />
            </FormField>
          </div>
          <dl className="mt-5 grid gap-3 rounded-lg bg-[#F9FAFB] p-4 text-[13px] sm:grid-cols-2">
            <div>
              <dt className="text-ink-muted">Amount preview</dt>
              <dd className="text-[16px] font-semibold text-ink tabular-nums">{money}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Number preview</dt>
              <dd className="text-[16px] font-semibold text-ink tabular-nums">{num}</dd>
            </div>
          </dl>
          <p className="mt-3 text-[12px] leading-4 text-ink-muted">Preview only. The demo data is in INR and the rest of the prototype keeps displaying INR with Indian grouping; no currency conversion happens.</p>
        </Section>
      );
    }
    case "notifications": {
      const n = draft.notifications;
      const t = (k: keyof AppSettings["notifications"], v: boolean) => set("notifications", { ...n, [k]: v });
      return (
        <Section title="Notifications" description="Which events you want to hear about." footer={footer}>
          <div className="divide-y divide-line-soft">
            <Toggle checked={n.lowStock} onChange={(v) => t("lowStock", v)} label="Low and out-of-stock alerts" hint="Shown in the header bell in this prototype." />
            <Toggle checked={n.poApproval} onChange={(v) => t("poApproval", v)} label="Purchase orders awaiting approval" />
            <Toggle checked={n.receipts} onChange={(v) => t("receipts", v)} label="Goods received" />
            <Toggle checked={n.transfers} onChange={(v) => t("transfers", v)} label="Transfers in transit" />
            <Toggle checked={n.dailyDigest} onChange={(v) => t("dailyDigest", v)} label="Daily email digest" hint="Email delivery isn't connected — this preference is stored only." />
          </div>
        </Section>
      );
    }
    case "preferences": {
      const p = draft.preferences;
      return (
        <Section title="User Preferences" description="Personal settings for Admin User." footer={footer}>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Start page" htmlFor="pref-landing">
              <SelectField
                id="pref-landing"
                value={p.landing}
                onChange={(v) => set("preferences", { ...p, landing: v })}
                options={[
                  { value: "/dashboard", label: "Dashboard" },
                  { value: "/items", label: "Items & Products" },
                  { value: "/reorder-alerts", label: "Reorder Alerts" },
                  { value: "/sales-orders", label: "Sales Orders" },
                ]}
              />
            </FormField>
            <FormField label="Table density" htmlFor="pref-density">
              <SelectField
                id="pref-density"
                value={p.density}
                onChange={(v) => set("preferences", { ...p, density: v as AppSettings["preferences"]["density"] })}
                options={[
                  { value: "comfortable", label: "Comfortable" },
                  { value: "compact", label: "Compact" },
                ]}
              />
            </FormField>
            <FormField label="Rows per page" htmlFor="pref-rows">
              <SelectField id="pref-rows" value={String(p.rowsPerPage)} onChange={(v) => set("preferences", { ...p, rowsPerPage: Number(v) })} options={["10", "25", "50"].map((v) => ({ value: v, label: v }))} />
            </FormField>
          </div>
          <p className="mt-3 text-[12px] leading-4 text-ink-muted">Stored for the demo session; screens keep their standard layout in this prototype.</p>
        </Section>
      );
    }
    case "integrations": {
      const list: { id: string; name: string; text: string }[] = [
        { id: "accounting", name: "Accounting software", text: "Sync supplier bills, invoices and stock valuation." },
        { id: "ecommerce", name: "E-commerce store", text: "Import online orders and publish stock levels." },
        { id: "shipping", name: "Shipping carriers", text: "Book shipments and fetch tracking updates." },
        { id: "email", name: "Email delivery", text: "Send purchase orders and alerts by email." },
      ];
      return (
        <Section title="Integrations" description="Connections to other systems.">
          <PrototypeNote className="mb-4">No third-party service can be connected in this prototype, and no credentials are collected or stored.</PrototypeNote>
          <ul className="grid gap-3 sm:grid-cols-2">
            {list.map((i) => (
              <li key={i.id} className="flex items-start justify-between gap-3 rounded-xl border border-line p-4">
                <span>
                  <span className="block text-[14px] font-semibold text-ink">{i.name}</span>
                  <span className="block text-[12.5px] leading-5 text-ink-muted">{i.text}</span>
                  <span className="mt-2 inline-block rounded-full bg-[#F2F4F7] px-2 py-0.5 text-[11.5px] font-medium text-ink-muted">Not connected</span>
                </span>
                <UnavailableTip reason="Integrations aren't available in this prototype">
                  <OutlineButton disabled className="h-8">
                    Connect
                  </OutlineButton>
                </UnavailableTip>
              </li>
            ))}
          </ul>
        </Section>
      );
    }
    case "api":
      return (
        <Section title="API Settings" description="Programmatic access to EVOQ Inventory.">
          <PrototypeNote className="mb-4">This prototype has no API. Keys are never generated, displayed or stored here.</PrototypeNote>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="API key" htmlFor="api-key" hint="Unavailable in the prototype.">
              <input id="api-key" value="Not available" disabled className={cn(fieldClass, "font-mono text-ink-muted")} />
            </FormField>
            <FormField label="Base URL" htmlFor="api-url">
              <input id="api-url" value="—" disabled className={cn(fieldClass, "font-mono text-ink-muted")} />
            </FormField>
          </div>
          <UnavailableTip reason="API keys can't be generated in this prototype" className="mt-4">
            <OutlineButton disabled>Generate API key</OutlineButton>
          </UnavailableTip>
        </Section>
      );
    default:
      return null;
  }
}

export function SettingsView({ initialSection }: { initialSection?: string }) {
  const { data: settings } = useSettings();
  const [section, setSection] = useState(SECTIONS.some((s) => s.id === initialSection) ? initialSection! : "organisation");
  return (
    <PageShell>
      <PageHeading crumbs={[{ label: "Administration" }, { label: "Settings & Integrations" }]} title="Settings & Integrations" description="Organisation details, inventory rules, numbering and preferences." />
      <div className="mt-5 grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="min-w-0">
          <ul className="flex gap-1 overflow-x-auto pb-1 scrollbar-none lg:flex-col lg:overflow-visible">
            {SECTIONS.map((s) => {
              const IconCmp = s.icon;
              const active = s.id === section;
              return (
                <li key={s.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setSection(s.id)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-left text-[13.5px] whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-action",
                      active ? "bg-brand-10 font-medium text-ink" : "text-ink-body hover:bg-brand-depth-10 hover:text-ink",
                    )}
                  >
                    <IconCmp size={17} weight={active ? "fill" : "regular"} aria-hidden className={active ? "text-brand" : "text-ink-muted"} />
                    {s.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="min-w-0 space-y-4">
          {!settings ? (
            <Skeleton className="h-80 rounded-xl" />
          ) : section === "organisation" ? (
            <OrganisationSection key={JSON.stringify(settings)} settings={settings} />
          ) : (
            <SettingsBody key={`${section}-${JSON.stringify(settings)}`} section={section} settings={settings} />
          )}
          <p className="text-[12px] leading-4 text-ink-muted">Settings are demo values kept in this browser tab and reset on reload. Numbering prefixes, units and the reorder rule are used by the other screens of this prototype.</p>
        </div>
      </div>
    </PageShell>
  );
}
