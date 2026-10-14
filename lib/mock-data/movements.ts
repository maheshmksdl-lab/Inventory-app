/**
 * DEMO DATA — a generated stock-movement ledger and order pipeline.
 * Generated from a fixed seed, so every load (server and browser) shows the
 * same history ending on the demo date.
 */
import { addDays } from "@/lib/format";
import type { Product, PurchaseOrderStatus, SalesOrderStatus, StockMovement, WarehouseId } from "@/lib/types/inventory";
import { USERS } from "./warehouses";

/** "Today" for the demo dataset. */
export const DEMO_TODAY = "2026-10-14";
const HISTORY_DAYS = 120;

/** Deterministic PRNG (mulberry32). */
export function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WH: WarehouseId[] = ["wh-main", "wh-branch", "wh-remote"];
const WH_WEIGHT = [0.55, 0.3, 0.15];

export function seedMovements(products: Product[]): StockMovement[] {
  const rand = rng(20261014);
  const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const pickWh = () => {
    const r = rand();
    return r < WH_WEIGHT[0] ? WH[0] : r < WH_WEIGHT[0] + WH_WEIGHT[1] ? WH[1] : WH[2];
  };
  const tracked = products.filter((p) => p.lifecycle === "active");
  const seq = { grn: 1000, so: 2000, trf: 1000, adj: 500 };
  const out: StockMovement[] = [];

  for (let d = HISTORY_DAYS - 1; d >= 0; d--) {
    const day = addDays(DEMO_TODAY, -d);
    const weekday = new Date(`${day}T12:00:00`).getDay();
    const count = weekday === 0 ? int(1, 3) : int(6, 12);
    const times = Array.from({ length: count }, () => int(9 * 60, 18 * 60 + 30)).sort((a, b) => a - b);
    for (const minutes of times) {
      const product = pick(tracked);
      const at = `${day}T${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00`;
      const user = pick(USERS.slice(0, 4));
      const r = rand();
      const wh = pickWh();
      let m: Omit<StockMovement, "id">;
      if (r < 0.22) {
        m = { at, productId: product.id, type: "received", quantity: int(20, 80), from: null, to: wh, reference: `GRN-${++seq.grn}`, user };
      } else if (r < 0.75) {
        m = { at, productId: product.id, type: "issued", quantity: -int(3, 22), from: wh, to: null, reference: `SO-${++seq.so}`, user };
      } else if (r < 0.88) {
        const to = pick(WH.filter((w) => w !== wh));
        m = { at, productId: product.id, type: "transfer", quantity: int(5, 30), from: wh, to, reference: `TRF-${++seq.trf}`, user };
      } else {
        const q = int(1, 6) * (rand() < 0.7 ? -1 : 1);
        m = { at, productId: product.id, type: "adjustment", quantity: q, from: q < 0 ? wh : null, to: q > 0 ? wh : null, reference: `ADJ-${++seq.adj}`, user };
      }
      out.push({ id: `mv-${out.length + 1}`, ...m });
    }
  }
  return out.reverse(); // newest first
}

// ── Order pipeline (counts only — Purchase and Sales modules come later) ──

export const PURCHASE_ORDER_COUNTS: Record<WarehouseId, Record<PurchaseOrderStatus, number>> = {
  "wh-main": { draft: 4, "pending-approval": 3, confirmed: 6, "partially-received": 5, completed: 30, cancelled: 2 },
  "wh-branch": { draft: 3, "pending-approval": 2, confirmed: 5, "partially-received": 4, completed: 18, cancelled: 1 },
  "wh-remote": { draft: 1, "pending-approval": 1, confirmed: 3, "partially-received": 3, completed: 8, cancelled: 0 },
};

export const SALES_ORDER_COUNTS: Record<WarehouseId, Record<SalesOrderStatus, number>> = {
  "wh-main": { draft: 6, confirmed: 10, "partially-fulfilled": 8, fulfilled: 25, cancelled: 3 },
  "wh-branch": { draft: 4, confirmed: 6, "partially-fulfilled": 6, fulfilled: 12, cancelled: 1 },
  "wh-remote": { draft: 2, confirmed: 2, "partially-fulfilled": 2, fulfilled: 5, cancelled: 1 },
};

