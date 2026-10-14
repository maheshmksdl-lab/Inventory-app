/**
 * Mock API for the purchasing, sales, warehouse and admin modules. Records are
 * kept in the in-memory demo store (this browser tab only). Saving a document
 * never changes stock balances: receipts, transfers, adjustments and shipments
 * are prototype records, not inventory transactions.
 */
import { VENDORS, WAREHOUSES } from "@/lib/mock-data/warehouses";
import type { AppSettings } from "@/lib/types/operations";
import { ApiError } from "./inventory";
import { clone, collections, delay, products, replaceSettings, settings, type CollectionKey, type Collections, type RecordOf } from "./store";

export type { CollectionKey, Collections, RecordOf };

const NUMBERED: Partial<Record<CollectionKey, keyof AppSettings["numbering"]>> = {
  purchaseOrders: "po",
  salesOrders: "so",
  goodsReceipts: "grn",
  transfers: "trf",
  adjustments: "adj",
  supplierBills: "bill",
  salesReturns: "rma",
  stocktakes: "stk",
};

let seq = 0;

/** Next document number, using the prefix from Settings → Numbering. */
function nextNumber(kind: CollectionKey): string {
  const prefix = settings().numbering[NUMBERED[kind]!];
  const list = collections()[kind] as { number?: string }[];
  const max = list.reduce((m, r) => Math.max(m, Number((r.number ?? "").replace(/\D/g, "")) || 0), 1000);
  return `${prefix}${max + 1}`;
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

function assertUnique<K extends CollectionKey>(kind: K, rec: RecordOf<K>, field: keyof RecordOf<K> & string, label: string) {
  const value = String(rec[field] ?? "");
  const clash = (collections()[kind] as RecordOf<K>[]).find((r) => (r as { id: string }).id !== (rec as { id: string }).id && same(String(r[field] ?? ""), value));
  if (clash) throw new ApiError(`${label} “${value}” is already in use`, field);
}

/** Field checks and knock-on updates that a backend would do on save. */
function beforeSave<K extends CollectionKey>(kind: K, rec: RecordOf<K>, previous: RecordOf<K> | undefined) {
  switch (kind) {
    case "categories":
    case "brands": {
      assertUnique(kind, rec, "name" as never, kind === "categories" ? "Category" : "Brand");
      const prev = previous as RecordOf<"categories"> | undefined;
      const next = rec as RecordOf<"categories">;
      // Products refer to categories and brands by name: carry a rename through.
      if (prev && prev.name !== next.name) {
        const field = kind === "categories" ? "category" : "brand";
        for (const p of products()) if (p[field] === prev.name) p[field] = next.name;
      }
      break;
    }
    case "vendors": {
      assertUnique(kind, rec, "code" as never, "Vendor code");
      const v = rec as RecordOf<"vendors">;
      const entry = VENDORS.find((x) => x.id === v.id);
      if (entry) entry.name = v.name;
      else VENDORS.push({ id: v.id, name: v.name });
      break;
    }
    case "customers":
      assertUnique(kind, rec, "code" as never, "Customer code");
      break;
    case "warehouses": {
      assertUnique(kind, rec, "code" as never, "Warehouse code");
      const w = rec as RecordOf<"warehouses">;
      const entry = WAREHOUSES.find((x) => x.id === w.id);
      if (entry) Object.assign(entry, { name: w.name, short: w.short, city: w.city });
      break;
    }
    case "users":
      assertUnique(kind, rec, "email" as never, "Email");
      break;
  }
}

export async function listRecords<K extends CollectionKey>(kind: K): Promise<Collections[K]> {
  await delay();
  return clone(collections()[kind]);
}

export async function getRecord<K extends CollectionKey>(kind: K, id: string): Promise<RecordOf<K>> {
  await delay();
  const rec = (collections()[kind] as RecordOf<K>[]).find((r) => (r as { id: string }).id === id);
  if (!rec) throw new ApiError("Record not found");
  return clone(rec);
}

/**
 * Create (empty id) or replace a record. New documents get the next number
 * and are added to the top of their list.
 */
export async function saveRecord<K extends CollectionKey>(kind: K, input: RecordOf<K>): Promise<RecordOf<K>> {
  await delay();
  const list = collections()[kind] as RecordOf<K>[];
  const rec = clone(input) as RecordOf<K> & { id: string; number?: string };
  const idx = rec.id ? list.findIndex((r) => (r as { id: string }).id === rec.id) : -1;
  const previous = idx >= 0 ? list[idx] : undefined;
  if (idx < 0) {
    if (NUMBERED[kind] && !rec.number) rec.number = nextNumber(kind);
    rec.id = rec.id || (rec.number ? rec.number.toLowerCase() : `${kind.slice(0, 3)}-${Date.now().toString(36)}-${++seq}`);
  }
  beforeSave(kind, rec, previous);
  if (idx >= 0) list[idx] = rec;
  else list.unshift(rec);
  return clone(rec);
}

/** Preview the number a new document will get (shown on create forms). */
export async function peekNumber(kind: CollectionKey): Promise<string> {
  await delay(40);
  return nextNumber(kind);
}

// ── Settings ─────────────────────────────────────────────────────────

export async function getSettings(): Promise<AppSettings> {
  await delay(80);
  return clone(settings());
}

export async function saveSettings(next: AppSettings): Promise<AppSettings> {
  await delay();
  replaceSettings(clone(next));
  return clone(settings());
}

