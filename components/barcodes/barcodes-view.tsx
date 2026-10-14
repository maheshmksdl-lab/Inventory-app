"use client";

import { useMemo, useState, type FormEvent } from "react";
import { BarcodeIcon, MinusIcon, PlusIcon, PrinterIcon, ScanIcon, TrashIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { matches } from "@/components/shared/data-table";
import { PrototypeNote } from "@/components/shared/doc-ui";
import { Card, CardHeader, fieldClass, FormField, IconButton, OutlineButton, PageHeading, PageShell, PrimaryButton, SearchInput, SelectField } from "@/components/shared/inventory-ui";
import { ProductThumb } from "@/components/shared/product-thumb";
import { EmptyState } from "@/components/shared/state-panels";
import { useProducts } from "@/hooks/use-operations";
import { pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BarcodeLabel, canEncode, LABEL_SIZES, type LabelSize, type Symbology } from "./barcode-label";

const SYMBOLOGIES: { value: Symbology; label: string }[] = [
  { value: "ean13", label: "EAN-13 barcode (item barcode)" },
  { value: "code128", label: "Code 128 barcode (SKU)" },
  { value: "qr", label: "QR code (SKU, barcode, name)" },
];

export function BarcodesView() {
  const { data: products } = useProducts();
  const [q, setQ] = useState("");
  const [scan, setScan] = useState("");
  const [scanMsg, setScanMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [queue, setQueue] = useState<{ id: string; copies: number }[]>([]);
  const [focus, setFocus] = useState<string | null>(null);
  const [symbology, setSymbology] = useState<Symbology>("ean13");
  const [size, setSize] = useState<LabelSize>("medium");
  const [showName, setShowName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [preview, setPreview] = useState(false);

  const active = useMemo(() => (products ?? []).filter((p) => p.lifecycle !== "archived"), [products]);
  const results = useMemo(() => active.filter((p) => matches(q, p.name, p.sku, p.barcode)).slice(0, 8), [active, q]);
  const byId = new Map(active.map((p) => [p.id, p]));
  const focused = byId.get(focus ?? queue[0]?.id ?? "");
  const totalLabels = queue.reduce((s, x) => s + x.copies, 0);

  const add = (id: string) => {
    setQueue((qu) => (qu.some((x) => x.id === id) ? qu : [...qu, { id, copies: 1 }]));
    setFocus(id);
  };
  const setCopies = (id: string, copies: number) => setQueue((qu) => qu.map((x) => (x.id === id ? { ...x, copies: Math.max(1, Math.min(500, copies)) } : x)));

  const lookup = (e: FormEvent) => {
    e.preventDefault();
    const code = scan.trim();
    if (!code) return;
    const hit = active.find((p) => p.barcode === code || p.sku.toLowerCase() === code.toLowerCase());
    if (hit) {
      add(hit.id);
      setScanMsg({ ok: true, text: `Matched ${hit.name} (${hit.sku}).` });
      setScan("");
    } else setScanMsg({ ok: false, text: `No item has the barcode or SKU “${code}”.` });
  };

  const sheet = queue.flatMap((x) => {
    const p = byId.get(x.id);
    return p ? Array.from({ length: x.copies }, (_, i) => ({ key: `${x.id}-${i}`, p })) : [];
  });
  const unprintable = queue.filter((x) => byId.get(x.id) && !canEncode(byId.get(x.id)!, symbology)).length;

  const print = () => {
    if (typeof window.print !== "function") {
      toast.error("Printing isn't supported in this browser");
      return;
    }
    setPreview(true);
    // Let the sheet render before opening the print dialog.
    requestAnimationFrame(() => setTimeout(() => window.print(), 50));
  };

  return (
    <PageShell>
      <PageHeading
        crumbs={[{ label: "Inventory" }, { label: "Barcode & QR Codes" }]}
        title="Barcode & QR Codes"
        description="Find products, preview labels and print them from your browser."
        actions={
          <>
            <OutlineButton onClick={() => setPreview((v) => !v)} disabled={!queue.length} aria-pressed={preview}>
              {preview ? "Hide print preview" : "Print preview"}
            </OutlineButton>
            <PrimaryButton icon={PrinterIcon} onClick={print} disabled={!queue.length}>
              Print {totalLabels ? pluralize(totalLabels, "label") : "labels"}
            </PrimaryButton>
          </>
        }
      />

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Find products" subtitle="Search by name, SKU or barcode" />
            <div className="space-y-3 px-5 pb-5">
              <SearchInput value={q} onChange={setQ} placeholder="Search products…" label="Search products for labels" />
              <ul className="divide-y divide-line-soft rounded-lg border border-line" aria-label="Matching products">
                {!products && <li className="px-3 py-3 text-[13px] text-ink-muted">Loading products…</li>}
                {products && results.length === 0 && <li className="px-3 py-3 text-[13px] text-ink-muted">No products match “{q}”.</li>}
                {results.map((p) => {
                  const inQueue = queue.some((x) => x.id === p.id);
                  return (
                    <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                      <ProductThumb icon={p.icon} size={30} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-ink">{p.name}</span>
                        <span className="block font-mono text-[11.5px] text-ink-muted">
                          {p.sku} · {p.barcode || "no barcode"}
                        </span>
                      </span>
                      <OutlineButton className="h-8" icon={inQueue ? undefined : PlusIcon} disabled={inQueue} onClick={() => add(p.id)}>
                        {inQueue ? "Added" : "Add"}
                      </OutlineButton>
                    </li>
                  );
                })}
              </ul>
              <form onSubmit={lookup} className="rounded-lg bg-[#F9FAFB] p-3">
                <label htmlFor="manual-barcode" className="text-field-label text-ink-body">
                  Enter a barcode or SKU
                </label>
                <div className="mt-1.5 flex gap-2">
                  <input id="manual-barcode" value={scan} onChange={(e) => setScan(e.target.value)} inputMode="numeric" autoComplete="off" placeholder="e.g. 8904471000107" className={cn(fieldClass, "font-mono")} aria-describedby="manual-barcode-msg" />
                  <OutlineButton type="submit" icon={ScanIcon}>
                    Look up
                  </OutlineButton>
                </div>
                <p id="manual-barcode-msg" role="status" className={cn("mt-1.5 text-[12px] leading-4", scanMsg ? (scanMsg.ok ? "text-[var(--success)]" : "text-[var(--danger)]") : "text-ink-muted")}>
                  {scanMsg?.text ?? "Camera scanning isn't available in this prototype. A USB scanner that types like a keyboard can enter codes here."}
                </p>
              </form>
            </div>
          </Card>

          <Card>
            <CardHeader title="Labels to print" subtitle={queue.length ? `${pluralize(queue.length, "product")} · ${pluralize(totalLabels, "label")}` : "Add products to build a label sheet"} />
            {queue.length === 0 ? (
              <EmptyState icon={BarcodeIcon} title="No products selected" hint="Search above, or look up a barcode, to add products." className="py-8" />
            ) : (
              <ul className="divide-y divide-line-soft border-t border-line-soft">
                {queue.map((x) => {
                  const p = byId.get(x.id);
                  if (!p) return null;
                  const ok = canEncode(p, symbology);
                  return (
                    <li key={x.id} className={cn("flex flex-wrap items-center gap-3 px-5 py-2.5", focused?.id === x.id && "bg-brand-surface")}>
                      <button type="button" onClick={() => setFocus(x.id)} className="flex min-w-0 flex-1 items-center gap-3 rounded text-left focus-visible:outline-2 focus-visible:outline-brand-action" aria-pressed={focused?.id === x.id}>
                        <ProductThumb icon={p.icon} size={30} />
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-medium text-ink">{p.name}</span>
                          <span className={cn("block text-[11.5px]", ok ? "font-mono text-ink-muted" : "text-[var(--danger)]")}>{ok ? p.sku : "Can't encode with the chosen code type"}</span>
                        </span>
                      </button>
                      <div className="flex items-center gap-1" role="group" aria-label={`Copies of ${p.name}`}>
                        <IconButton aria-label="One fewer" onClick={() => setCopies(x.id, x.copies - 1)} disabled={x.copies <= 1}>
                          <MinusIcon size={14} aria-hidden />
                        </IconButton>
                        <input value={x.copies} onChange={(e) => setCopies(x.id, Number(e.target.value.replace(/\D/g, "")) || 1)} inputMode="numeric" aria-label={`Number of labels for ${p.name}`} className={cn(fieldClass, "h-8 w-14 text-center tabular-nums")} />
                        <IconButton aria-label="One more" onClick={() => setCopies(x.id, x.copies + 1)}>
                          <PlusIcon size={14} aria-hidden />
                        </IconButton>
                      </div>
                      <IconButton aria-label={`Remove ${p.name}`} onClick={() => setQueue((qu) => qu.filter((y) => y.id !== x.id))}>
                        <TrashIcon size={16} aria-hidden />
                      </IconButton>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Label settings" />
            <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
              <FormField label="Code type" htmlFor="label-symbology">
                <SelectField id="label-symbology" value={symbology} onChange={(v) => setSymbology(v as Symbology)} options={SYMBOLOGIES} />
              </FormField>
              <FormField label="Label size" htmlFor="label-size">
                <SelectField id="label-size" value={size} onChange={(v) => setSize(v as LabelSize)} options={Object.entries(LABEL_SIZES).map(([value, s]) => ({ value, label: s.label }))} />
              </FormField>
              <label className="flex items-center gap-2 text-[13px] text-ink-body">
                <Checkbox checked={showName} onCheckedChange={(v) => setShowName(v === true)} /> Show product name
              </label>
              <label className="flex items-center gap-2 text-[13px] text-ink-body">
                <Checkbox checked={showPrice} onCheckedChange={(v) => setShowPrice(v === true)} /> Show selling price
              </label>
            </div>
          </Card>
          <Card>
            <CardHeader title="Preview" subtitle={focused ? `${focused.name} · actual size` : "Select a product"} />
            <div className="flex min-h-[220px] items-center justify-center overflow-x-auto bg-[#F9FAFB] px-5 py-8 scrollbar-thin">
              {focused ? (
                <BarcodeLabel product={{ name: focused.name, sku: focused.sku, barcode: focused.barcode, price: focused.sellingPrice }} symbology={symbology} size={size} showName={showName} showPrice={showPrice} className="shadow-card" />
              ) : (
                <p className="text-[13px] text-ink-muted">Add a product to see its label.</p>
              )}
            </div>
            {unprintable > 0 && <p className="border-t border-line-soft px-5 py-2.5 text-[12.5px] text-[var(--warning)]">{pluralize(unprintable, "product")} can&apos;t be encoded as {SYMBOLOGIES.find((s) => s.value === symbology)?.label}. Their labels will show a notice instead.</p>}
          </Card>
          <PrototypeNote label={null}>Labels are drawn in your browser and printed with the browser&apos;s print dialog. Use the &ldquo;Actual size&rdquo; / 100% scale option for correct label dimensions.</PrototypeNote>
        </div>
      </div>

      {preview && queue.length > 0 && (
        <Card className="mt-4">
          <CardHeader title="Print preview" subtitle={`${pluralize(sheet.length, "label")} · ${LABEL_SIZES[size].label}`} action={<OutlineButton icon={PrinterIcon} onClick={print}>Print</OutlineButton>} />
          <div className="print-area flex flex-wrap content-start gap-[3mm] border-t border-line-soft bg-white p-5">
            {sheet.map(({ key, p }) => (
              <BarcodeLabel key={key} product={{ name: p.name, sku: p.sku, barcode: p.barcode, price: p.sellingPrice }} symbology={symbology} size={size} showName={showName} showPrice={showPrice} />
            ))}
          </div>
        </Card>
      )}
    </PageShell>
  );
}
