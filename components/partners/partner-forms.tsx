"use client";

import { toast } from "sonner";
import { z } from "zod";
import { ChoiceField, FormDialog, SESSION_NOTE, TextAreaField, TextField, useZodForm } from "@/components/shared/form-kit";
import { useSaveRecord } from "@/hooks/use-operations";
import { nowIso } from "@/lib/format";
import type { CustomerRecord, VendorRecord } from "@/lib/types/operations";

const phone = z
  .string()
  .trim()
  .regex(/^[+\d][\d\s-]{6,}$/, "Enter a valid phone number");
const code = (prefix: string) =>
  z
    .string()
    .trim()
    .min(2, "Enter a code")
    .max(12, "Keep the code under 12 characters")
    .regex(/^[A-Za-z0-9-]+$/, `Letters, numbers and hyphens only (e.g. ${prefix})`);

const vendorSchema = z.object({
  name: z.string().trim().min(2, "Enter the vendor name").max(80),
  code: code("V-ACM"),
  contactName: z.string().trim().min(2, "Enter a contact person"),
  email: z.email("Enter a valid email address"),
  phone,
  address: z.string().trim().min(3, "Enter the address"),
  city: z.string().trim().min(2, "Enter the city"),
  gstin: z
    .string()
    .trim()
    .refine((v) => v === "" || /^[0-9]{2}[A-Z0-9]{13}$/i.test(v), "GSTIN is 15 characters (or leave blank)"),
  paymentTerms: z.string().min(1, "Choose payment terms"),
});
type VendorValues = z.input<typeof vendorSchema>;
const TERMS = ["Advance", "Net 15", "Net 30", "Net 45", "Net 60"].map((t) => ({ value: t, label: t }));

/** Create / edit a vendor. Creates a demo record only — no supplier account or message is sent. */
export function VendorFormDialog({ vendor, onClose, onSaved }: { vendor: VendorRecord | null; onClose: () => void; onSaved?: (v: VendorRecord) => void }) {
  const save = useSaveRecord("vendors");
  const v = vendor;
  const form = useZodForm<VendorValues>(
    vendorSchema,
    { name: v?.name ?? "", code: v?.code ?? "", contactName: v?.contactName ?? "", email: v?.email ?? "", phone: v?.phone ?? "", address: v?.address ?? "", city: v?.city ?? "", gstin: v?.gstin ?? "", paymentTerms: v?.paymentTerms ?? "Net 30" },
    "vendor",
  );
  return (
    <FormDialog
      open
      wide
      onOpenChange={(o) => !o && onClose()}
      title={v ? `Edit ${v.name}` : "New vendor"}
      description="Demo record only — no supplier account is created and nothing is sent to the vendor."
      submitLabel={v ? "Save changes" : "Create vendor"}
      saving={form.saving}
      onSubmit={form.handleSubmit(async (vals) => {
        const saved = await save.mutateAsync({ id: v?.id ?? "", status: v?.status ?? "active", createdAt: v?.createdAt ?? nowIso(), ...vals, code: vals.code.trim().toUpperCase(), gstin: vals.gstin.trim().toUpperCase() });
        toast.success(v ? "Vendor updated" : "Vendor created", { description: `${saved.name} · ${SESSION_NOTE}` });
        onSaved?.(saved);
        onClose();
      })}
    >
      <TextField form={form} name="name" label="Vendor name" required placeholder="e.g. Acme Supplies" />
      <TextField form={form} name="code" label="Vendor code" required placeholder="e.g. V-ACM" inputClassName="font-mono uppercase" />
      <TextField form={form} name="contactName" label="Contact person" required />
      <TextField form={form} name="email" label="Email" required type="email" />
      <TextField form={form} name="phone" label="Phone" required inputMode="tel" />
      <ChoiceField form={form} name="paymentTerms" label="Payment terms" required options={TERMS} />
      <TextField form={form} name="address" label="Address" required className="sm:col-span-2" />
      <TextField form={form} name="city" label="City" required />
      <TextField form={form} name="gstin" label="GSTIN" hint="Optional · 15 characters" inputClassName="font-mono uppercase" />
    </FormDialog>
  );
}

const customerSchema = z.object({
  name: z.string().trim().min(2, "Enter the customer name").max(80),
  code: code("C-120"),
  company: z.string().trim().min(2, "Enter the company"),
  contactName: z.string().trim().min(2, "Enter a contact person"),
  email: z.email("Enter a valid email address"),
  phone,
  billingAddress: z.string().trim().min(5, "Enter the billing address"),
  shippingAddress: z.string().trim().min(5, "Enter the shipping address"),
});
type CustomerValues = z.input<typeof customerSchema>;

export function CustomerFormDialog({ customer, onClose }: { customer: CustomerRecord | null; onClose: () => void }) {
  const save = useSaveRecord("customers");
  const c = customer;
  const form = useZodForm<CustomerValues>(
    customerSchema,
    { name: c?.name ?? "", code: c?.code ?? "", company: c?.company ?? "", contactName: c?.contactName ?? "", email: c?.email ?? "", phone: c?.phone ?? "", billingAddress: c?.billingAddress ?? "", shippingAddress: c?.shippingAddress ?? "" },
    "customer",
  );
  return (
    <FormDialog
      open
      wide
      onOpenChange={(o) => !o && onClose()}
      title={c ? `Edit ${c.name}` : "New customer"}
      description="Saved as a demo record in this browser tab. No customer account or email is created."
      submitLabel={c ? "Save changes" : "Create customer"}
      saving={form.saving}
      onSubmit={form.handleSubmit(async (vals) => {
        const saved = await save.mutateAsync({ id: c?.id ?? "", status: c?.status ?? "active", createdAt: c?.createdAt ?? nowIso(), ...vals, code: vals.code.trim().toUpperCase() });
        toast.success(c ? "Customer updated" : "Customer created", { description: `${saved.name} · ${SESSION_NOTE}` });
        onClose();
      })}
    >
      <TextField form={form} name="name" label="Customer name" required />
      <TextField form={form} name="code" label="Customer code" required placeholder="e.g. C-120" inputClassName="font-mono uppercase" />
      <TextField form={form} name="company" label="Company" required />
      <TextField form={form} name="contactName" label="Contact person" required />
      <TextField form={form} name="email" label="Email" required type="email" />
      <TextField form={form} name="phone" label="Phone" required inputMode="tel" />
      <TextAreaField form={form} name="billingAddress" label="Billing address" required rows={2} />
      <TextAreaField form={form} name="shippingAddress" label="Shipping address" required rows={2} />
      {form.values.billingAddress && form.values.shippingAddress !== form.values.billingAddress && (
        <button type="button" onClick={() => form.set("shippingAddress", form.values.billingAddress)} className="justify-self-start rounded text-[12.5px] font-medium text-brand hover:text-brand-press focus-visible:outline-2 focus-visible:outline-brand-action sm:col-span-2">
          Use billing address for shipping
        </button>
      )}
    </FormDialog>
  );
}
