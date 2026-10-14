"use client";

import { toast } from "sonner";
import { z } from "zod";
import { ChoiceField, FormDialog, SESSION_NOTE, TextField, useZodForm } from "@/components/shared/form-kit";
import { useSaveRecord } from "@/hooks/use-operations";
import type { WarehouseRecord } from "@/lib/types/operations";

const schema = z.object({
  name: z.string().trim().min(2, "Enter a warehouse name").max(60, "Keep the name under 60 characters"),
  short: z.string().trim().min(2, "Enter a short name").max(14, "Keep it under 14 characters"),
  code: z
    .string()
    .trim()
    .min(2, "Enter a code")
    .max(12, "Keep the code under 12 characters")
    .regex(/^[A-Za-z0-9-]+$/, "Letters, numbers and hyphens only"),
  city: z.string().trim().min(2, "Enter a city"),
  address: z.string().trim().min(5, "Enter the street address"),
  contactName: z.string().trim().min(2, "Enter a contact person"),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s-]{6,}$/, "Enter a valid phone number"),
  email: z.email("Enter a valid email address"),
  status: z.enum(["active", "inactive"]),
});
type Values = z.input<typeof schema>;

/** Create / edit a warehouse. New warehouses start empty: this prototype never moves stock into them. */
export function WarehouseFormDialog({ warehouse, onClose }: { warehouse: WarehouseRecord | null; onClose: () => void }) {
  const save = useSaveRecord("warehouses");
  const w = warehouse;
  const form = useZodForm<Values>(
    schema,
    { name: w?.name ?? "", short: w?.short ?? "", code: w?.code ?? "", city: w?.city ?? "", address: w?.address ?? "", contactName: w?.contactName ?? "", phone: w?.phone ?? "", email: w?.email ?? "", status: w?.status ?? "active" },
    "warehouse",
  );
  return (
    <FormDialog
      open
      wide
      onOpenChange={(o) => !o && onClose()}
      title={w ? `Edit ${w.name}` : "New warehouse"}
      description={w ? "Update the address, contact and status." : "New warehouses start with no stock. Stock can't be moved into them in this prototype."}
      submitLabel={w ? "Save changes" : "Create warehouse"}
      saving={form.saving}
      note="Demo only — saved in this browser tab."
      onSubmit={form.handleSubmit(async (v) => {
        const saved = await save.mutateAsync({
          id: w?.id ?? "",
          zones: w?.zones ?? [],
          createdAt: w?.createdAt ?? new Date().toISOString().slice(0, 19),
          ...v,
          code: v.code.trim().toUpperCase(),
          name: v.name.trim(),
          short: v.short.trim(),
          status: v.status,
        });
        toast.success(w ? "Changes saved" : "Warehouse created", { description: `${saved.name} · ${SESSION_NOTE}` });
        onClose();
      })}
    >
      <TextField form={form} name="name" label="Warehouse name" required placeholder="e.g. Chennai Warehouse" />
      <TextField form={form} name="short" label="Short name" required placeholder="e.g. Chennai" hint="Used in compact tables." />
      <TextField form={form} name="code" label="Code" required placeholder="e.g. MAA-01" inputClassName="font-mono uppercase" />
      <TextField form={form} name="city" label="City" required />
      <TextField form={form} name="address" label="Address" required className="sm:col-span-2" />
      <TextField form={form} name="contactName" label="Contact person" required />
      <TextField form={form} name="phone" label="Phone" required inputMode="tel" />
      <TextField form={form} name="email" label="Email" required type="email" />
      <ChoiceField
        form={form}
        name="status"
        label="Status"
        required
        options={[
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ]}
      />
    </FormDialog>
  );
}
