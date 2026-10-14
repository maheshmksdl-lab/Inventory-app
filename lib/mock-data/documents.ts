/**
 * DEMO DATA — purchasing, sales and stock documents, generated from a fixed
 * seed and tied to the existing movement ledger so every screen agrees:
 *
 * - Completed / partially received POs are built from GRN movements, and each
 *   goods receipt carries that movement's GRN reference.
 * - Fulfilled / partially fulfilled sales orders carry the SO reference of an
 *   issue movement.
 * - Received transfers and posted adjustments are the TRF / ADJ movements.
 * - Order counts per warehouse and status match the dashboard tables.
 *
 * Open documents (drafts, approvals, in-transit…) have no movements, because
 * nothing has moved yet — and this prototype never moves stock.
 */
import { docTotals, taxRateOf } from "@/lib/doc-math";
import { addDays } from "@/lib/format";
import type { Product, PurchaseOrderStatus, SalesOrderStatus, StockMovement, WarehouseId } from "@/lib/types/inventory";
import type {
  AdjustmentReason,
  DocActivity,
  Fulfilment,
  GoodsReceipt,
  PurchaseOrder,
  SalesOrder,
  SalesReturn,
  StockAdjustment,
  Stocktake,
  StockTransfer,
  SupplierBill,
  TransferStatus,
} from "@/lib/types/operations";
import { DEMO_TODAY, PURCHASE_ORDER_COUNTS, rng, SALES_ORDER_COUNTS } from "./movements";
import { VENDORS, WAREHOUSE_IDS } from "./warehouses";

export interface DocumentSeed {
  purchaseOrders: PurchaseOrder[];
  goodsReceipts: GoodsReceipt[];
  supplierBills: SupplierBill[];
  salesOrders: SalesOrder[];
  fulfilments: Fulfilment[];
  salesReturns: SalesReturn[];
  transfers: StockTransfer[];
  adjustments: StockAdjustment[];
  stocktakes: Stocktake[];
}

const STAFF = ["John D.", "Sarah M.", "Mike L.", "Priya K."];
const at = (date: string, time = "10:00:00") => `${date}T${time}`;
const day = (iso: string) => iso.slice(0, 10);
const numberOf = (ref: string) => Number(ref.replace(/\D/g, ""));

export function seedDocuments(products: Product[], movements: StockMovement[], customerIds: string[]): DocumentSeed {
  const rand = rng(41014);
  const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const byId = new Map(products.map((p) => [p.id, p]));
  const active = products.filter((p) => p.lifecycle === "active");
  const preferredVendor = (p: Product) => p.suppliers.find((s) => s.preferred)?.vendorId ?? p.suppliers[0]?.vendorId ?? VENDORS[0].id;
  const costFrom = (p: Product, vendorId: string) => p.suppliers.find((s) => s.vendorId === vendorId)?.lastCost ?? p.costPrice;
  const vendorProducts = (vendorId: string, except?: string) => active.filter((p) => p.id !== except && p.suppliers.some((s) => s.vendorId === vendorId));
  const onHand = (p: Product, w: string) => p.stock.find((b) => b.warehouseId === w)?.onHand ?? 0;
  const availableAt = (p: Product, w: string) => {
    const b = p.stock.find((x) => x.warehouseId === w);
    return b ? b.onHand - b.reserved : 0;
  };
  const poLine = (p: Product, vendorId: string, quantity: number, received: number) => ({ productId: p.id, quantity, unitPrice: costFrom(p, vendorId), taxRate: taxRateOf(p.taxClass), discount: 0, received });
  const soLine = (p: Product, quantity: number, fulfilled: number, discount = 0) => ({ productId: p.id, quantity, unitPrice: p.sellingPrice, taxRate: taxRateOf(p.taxClass), discount, fulfilled });

  // ── Purchase orders & goods receipts ───────────────────────────────

  type PoDraft = Omit<PurchaseOrder, "id" | "number"> & { grn?: StockMovement; rejected?: number };
  const poDrafts: PoDraft[] = [];
  const recent = (maxAge: number, minAge = 0) => addDays(DEMO_TODAY, -int(minAge, maxAge));

  for (const w of WAREHOUSE_IDS) {
    const grns = movements.filter((m) => m.type === "received" && m.to === w);
    let k = 0;
    const counts = PURCHASE_ORDER_COUNTS[w];
    for (let i = 0; i < counts.completed; i++) {
      const m = grns[k++];
      const p = byId.get(m.productId)!;
      const vendorId = preferredVendor(p);
      const orderDate = addDays(day(m.at), -int(5, 12));
      poDrafts.push({ vendorId, warehouseId: w, orderDate, expectedDate: addDays(orderDate, 7), status: "completed", lines: [poLine(p, vendorId, m.quantity, m.quantity)], notes: "", createdBy: "Priya K.", activity: [], grn: m, rejected: 0 });
    }
    for (let i = 0; i < counts["partially-received"]; i++) {
      const m = grns[k++];
      const p = byId.get(m.productId)!;
      const vendorId = preferredVendor(p);
      const orderDate = addDays(day(m.at), -int(4, 9));
      const rejected = rand() < 0.5 ? int(1, 3) : 0;
      const other = pick(vendorProducts(vendorId, p.id).length ? vendorProducts(vendorId, p.id) : [p]);
      const lines = [poLine(p, vendorId, m.quantity + rejected + int(2, 6) * 5, m.quantity)];
      if (other.id !== p.id) lines.push(poLine(other, vendorId, int(2, 8) * 5, 0));
      poDrafts.push({ vendorId, warehouseId: w, orderDate, expectedDate: addDays(orderDate, 10), status: "partially-received", lines, notes: "Balance quantity expected in the next delivery.", createdBy: "Priya K.", activity: [], grn: m, rejected });
    }
    const open: [PurchaseOrderStatus, number, number][] = [
      ["draft", 6, 0],
      ["pending-approval", 8, 1],
      ["confirmed", 14, 2],
      ["cancelled", 60, 10],
    ];
    for (const [status, maxAge, minAge] of open) {
      for (let i = 0; i < counts[status]; i++) {
        const vendorId = pick(VENDORS.filter((v) => vendorProducts(v.id).length > 0)).id;
        const pool = vendorProducts(vendorId);
        const lines = Array.from({ length: Math.min(pool.length, int(1, 3)) }, (_, j) => pool[(i + j * 3) % pool.length])
          .filter((p, j, arr) => arr.findIndex((x) => x.id === p.id) === j)
          .map((p) => poLine(p, vendorId, int(2, 12) * 5, 0));
        const orderDate = recent(maxAge, minAge);
        poDrafts.push({
          vendorId,
          warehouseId: w,
          orderDate,
          expectedDate: addDays(orderDate, int(7, 14)),
          status,
          lines,
          notes: status === "cancelled" ? "Cancelled — vendor could not meet the delivery date." : "",
          createdBy: pick(["Priya K.", "Sarah M."]),
          activity: [],
        });
      }
    }
  }

  poDrafts.sort((a, b) => a.orderDate.localeCompare(b.orderDate));
  const purchaseOrders: PurchaseOrder[] = [];
  const goodsReceipts: GoodsReceipt[] = [];
  poDrafts.forEach((d, i) => {
    const number = `PO-${1001 + i}`;
    const id = number.toLowerCase();
    const { grn, rejected = 0, ...po } = d;
    const activity: DocActivity[] = [{ at: at(po.orderDate, "09:30:00"), text: "Purchase order created as draft", user: po.createdBy }];
    if (po.status !== "draft") activity.push({ at: at(po.orderDate, "11:00:00"), text: "Submitted for approval", user: po.createdBy });
    if (["confirmed", "partially-received", "completed"].includes(po.status)) activity.push({ at: at(po.orderDate, "15:20:00"), text: "Approved and confirmed with vendor", user: "Admin User" });
    if (po.status === "cancelled") activity.push({ at: at(addDays(po.orderDate, 2), "12:10:00"), text: "Purchase order cancelled", user: "Admin User" });
    if (grn) {
      activity.push({ at: grn.at, text: `Goods received on ${grn.reference}`, user: grn.user });
      if (po.status === "completed") activity.push({ at: grn.at, text: "All lines received — order completed", user: grn.user });
      const first = po.lines[0];
      goodsReceipts.push({
        id: grn.reference.toLowerCase(),
        number: grn.reference,
        poId: id,
        vendorId: po.vendorId,
        warehouseId: po.warehouseId,
        receivedDate: day(grn.at),
        status: po.status === "completed" ? "received" : "partial",
        lines: po.lines.map((l, j) =>
          j === 0
            ? { productId: l.productId, expected: first.quantity, received: grn.quantity + rejected, rejected, rejectReason: rejected ? "Damaged in transit" : "" }
            : { productId: l.productId, expected: l.quantity, received: 0, rejected: 0, rejectReason: "" },
        ),
        notes: rejected ? `${rejected} unit${rejected === 1 ? "" : "s"} rejected at inspection and returned to the vendor.` : "",
        createdBy: grn.user,
      });
    }
    purchaseOrders.push({ ...po, id, number, activity: activity.reverse() });
  });

  // Two receipts saved as drafts against confirmed orders (no movement exists for these).
  purchaseOrders
    .filter((po) => po.status === "confirmed")
    .slice(-2)
    .forEach((po, i) => {
      goodsReceipts.push({
        id: `grn-${2001 + i}`,
        number: `GRN-${2001 + i}`,
        poId: po.id,
        vendorId: po.vendorId,
        warehouseId: po.warehouseId,
        receivedDate: addDays(DEMO_TODAY, -i),
        status: "draft",
        lines: po.lines.map((l) => ({ productId: l.productId, expected: l.quantity, received: l.quantity, rejected: 0, rejectReason: "" })),
        notes: "Draft — awaiting quality check before posting.",
        createdBy: "John D.",
      });
    });
  goodsReceipts.sort((a, b) => b.receivedDate.localeCompare(a.receivedDate) || numberOf(b.number) - numberOf(a.number));

  // ── Supplier bills ─────────────────────────────────────────────────

  const billable = purchaseOrders
    .filter((po) => po.status === "completed" || po.status === "partially-received")
    .map((po) => ({ po, receipt: goodsReceipts.find((g) => g.poId === po.id && g.status !== "draft")! }))
    .sort((a, b) => b.receipt.receivedDate.localeCompare(a.receipt.receivedDate))
    .slice(0, 26);
  const supplierBills: SupplierBill[] = billable
    .map(({ po, receipt }, i) => {
      const billDate = addDays(receipt.receivedDate, int(0, 2));
      const dueDate = addDays(billDate, 30);
      const amount = docTotals(po.lines.map((l) => ({ ...l, quantity: l.received }))).total;
      const status: SupplierBill["status"] = i < 2 ? "draft" : i < 5 ? "awaiting-review" : dueDate < DEMO_TODAY ? (rand() < 0.75 ? "paid" : "overdue") : "due";
      const vendorCode = po.vendorId.slice(3, 6).toUpperCase();
      return { billDate, po, dueDate, amount, status, vendorBillNo: `${vendorCode}/INV/${int(2000, 8999)}` };
    })
    .sort((a, b) => a.billDate.localeCompare(b.billDate))
    .map((b, i) => ({
      id: `bill-${1001 + i}`,
      number: `BILL-${1001 + i}`,
      vendorBillNo: b.vendorBillNo,
      vendorId: b.po.vendorId,
      poId: b.po.id,
      billDate: b.billDate,
      dueDate: b.dueDate,
      amount: b.amount,
      status: b.status,
      notes: "",
    }))
    .reverse();

  // ── Sales orders ───────────────────────────────────────────────────

  type SoDraft = Omit<SalesOrder, "id" | "number"> & { number?: string; issue?: StockMovement };
  const soDrafts: SoDraft[] = [];
  for (const w of WAREHOUSE_IDS) {
    const issues = movements.filter((m) => m.type === "issued" && m.from === w);
    let k = 0;
    const counts = SALES_ORDER_COUNTS[w];
    for (let i = 0; i < counts.fulfilled; i++) {
      const m = issues[k++];
      const p = byId.get(m.productId)!;
      const q = Math.abs(m.quantity);
      const orderDate = addDays(day(m.at), -int(0, 3));
      soDrafts.push({ number: m.reference, issue: m, customerId: pick(customerIds), warehouseId: w, orderDate, deliveryDate: addDays(day(m.at), int(1, 3)), status: "fulfilled", lines: [soLine(p, q, q)], notes: "", createdBy: pick(["Rahul N.", "Aisha K."]), activity: [] });
    }
    for (let i = 0; i < counts["partially-fulfilled"]; i++) {
      const m = issues[k++];
      const p = byId.get(m.productId)!;
      const q = Math.abs(m.quantity);
      const other = pick(active.filter((x) => x.id !== p.id));
      const orderDate = addDays(day(m.at), -int(0, 2));
      soDrafts.push({
        number: m.reference,
        issue: m,
        customerId: pick(customerIds),
        warehouseId: w,
        orderDate,
        deliveryDate: addDays(day(m.at), int(3, 7)),
        status: "partially-fulfilled",
        lines: [soLine(p, q + int(2, 8), q), soLine(other, int(1, 6), 0)],
        notes: "Customer accepts split delivery.",
        createdBy: pick(["Rahul N.", "Aisha K."]),
        activity: [],
      });
    }
    const open: [SalesOrderStatus, number, number][] = [
      ["draft", 5, 0],
      ["confirmed", 7, 0],
      ["cancelled", 50, 8],
    ];
    for (const [status, maxAge, minAge] of open) {
      for (let i = 0; i < counts[status]; i++) {
        const lines = Array.from({ length: int(1, 3) }, () => pick(active))
          .filter((p, j, arr) => arr.findIndex((x) => x.id === p.id) === j)
          .map((p) => soLine(p, int(1, 8), 0, rand() < 0.25 ? 5 : 0));
        const orderDate = recent(maxAge, minAge);
        soDrafts.push({
          customerId: pick(customerIds),
          warehouseId: w,
          orderDate,
          deliveryDate: addDays(orderDate, int(3, 10)),
          status,
          lines,
          notes: status === "cancelled" ? "Cancelled at the customer's request." : "",
          createdBy: pick(["Rahul N.", "Aisha K."]),
          activity: [],
        });
      }
    }
  }
  soDrafts.sort((a, b) => a.orderDate.localeCompare(b.orderDate));
  let soSeq = 3001;
  const salesOrders: SalesOrder[] = soDrafts.map(({ issue, number, ...so }) => {
    const num = number ?? `SO-${soSeq++}`;
    const activity: DocActivity[] = [{ at: at(so.orderDate, "10:15:00"), text: "Sales order created", user: so.createdBy }];
    if (so.status !== "draft" && so.status !== "cancelled") activity.push({ at: at(so.orderDate, "12:40:00"), text: "Order confirmed", user: so.createdBy });
    if (so.status === "cancelled") activity.push({ at: at(addDays(so.orderDate, 1), "11:00:00"), text: "Order cancelled", user: "Admin User" });
    if (issue) activity.push({ at: issue.at, text: so.status === "fulfilled" ? "Goods issued — order fulfilled" : "Partial shipment issued", user: issue.user });
    return { ...so, id: num.toLowerCase(), number: num, activity: activity.reverse() };
  });

  // ── Fulfilment queue ───────────────────────────────────────────────

  const CARRIERS = ["BlueDart", "Delhivery", "DTDC", "Own fleet"];
  const fulfilments: Fulfilment[] = [];
  salesOrders
    .filter((so) => so.status === "confirmed" || so.status === "partially-fulfilled")
    .forEach((so, i) => {
      const stage: Fulfilment["stage"] = so.status === "partially-fulfilled" ? (i % 2 ? "packed" : "picking") : i % 5 === 0 ? "packed" : i % 3 === 0 ? "picking" : "to-pick";
      const lines = so.lines
        .filter((l) => l.quantity > l.fulfilled)
        .map((l) => {
          const ordered = l.quantity - l.fulfilled;
          const picked = stage === "to-pick" ? 0 : stage === "picking" ? Math.floor(ordered / 2) : ordered;
          return { productId: l.productId, ordered, picked, packed: stage === "packed" ? ordered : 0 };
        });
      fulfilments.push({
        id: `ful-${so.number.toLowerCase()}`,
        soId: so.id,
        stage,
        lines,
        carrier: stage === "packed" ? pick(CARRIERS) : "",
        tracking: "",
        packages: stage === "packed" ? int(1, 3) : 0,
        weightKg: stage === "packed" ? int(2, 18) : 0,
        historical: false,
        updatedAt: at(addDays(DEMO_TODAY, -int(0, 2)), "11:30:00"),
        activity: [{ at: at(so.orderDate, "12:40:00"), text: "Added to the fulfilment queue", user: so.createdBy }],
      });
    });
  salesOrders
    .filter((so) => so.status === "fulfilled")
    .slice(-10)
    .forEach((so) => {
      const carrier = pick(CARRIERS);
      fulfilments.push({
        id: `ful-${so.number.toLowerCase()}`,
        soId: so.id,
        stage: "dispatched",
        lines: so.lines.map((l) => ({ productId: l.productId, ordered: l.quantity, picked: l.quantity, packed: l.quantity })),
        carrier,
        tracking: carrier === "Own fleet" ? "" : `DEMO${int(100000, 999999)}`,
        packages: int(1, 2),
        weightKg: int(1, 12),
        historical: true,
        updatedAt: so.activity[0].at,
        activity: [{ at: so.activity[0].at, text: "Dispatched (demo history record)", user: so.activity[0].user }],
      });
    });

  // ── Sales returns ──────────────────────────────────────────────────

  const RETURN_REASONS = ["Damaged on arrival", "Defective", "Wrong item sent", "No longer needed", "Not as described"];
  const fulfilledSos = salesOrders.filter((so) => so.status === "fulfilled").reverse();
  const returnPlan: [SalesReturn["status"], SalesReturn["lines"][number]["outcome"]][] = [
    ["requested", ""],
    ["received", ""],
    ["inspected", "restock"],
    ["inspected", "quarantine"],
    ["closed", "restock"],
    ["closed", "write-off"],
    ["rejected", ""],
  ];
  const salesReturns: SalesReturn[] = returnPlan
    .map(([status, outcome], i) => {
      const so = fulfilledSos[2 + i * 3];
      const l = so.lines[0];
      const requestedDate = addDays(so.deliveryDate, int(1, 6));
      return {
        id: "",
        number: "",
        soId: so.id,
        customerId: so.customerId,
        warehouseId: so.warehouseId,
        requestedDate: requestedDate > DEMO_TODAY ? DEMO_TODAY : requestedDate,
        status,
        lines: [{ productId: l.productId, quantity: Math.min(l.quantity, int(1, 2)), reason: RETURN_REASONS[i % RETURN_REASONS.length], outcome }],
        notes: status === "rejected" ? "Return window had closed; customer informed." : "",
        createdBy: pick(["Rahul N.", "Aisha K."]),
      };
    })
    .sort((a, b) => a.requestedDate.localeCompare(b.requestedDate))
    .map((r, i) => ({ ...r, id: `rma-${1001 + i}`, number: `RMA-${1001 + i}` }))
    .reverse();

  // ── Transfers ──────────────────────────────────────────────────────

  const transferCutoff = addDays(DEMO_TODAY, -45);
  const transfers: StockTransfer[] = movements
    .filter((m) => m.type === "transfer" && day(m.at) >= transferCutoff)
    .map((m) => {
      const createdDate = addDays(day(m.at), -int(1, 3));
      return {
        id: m.reference.toLowerCase(),
        number: m.reference,
        from: m.from!,
        to: m.to!,
        createdDate,
        expectedDate: day(m.at),
        status: "received" as TransferStatus,
        lines: [{ productId: m.productId, quantity: m.quantity }],
        notes: "",
        createdBy: m.user,
        activity: [
          { at: m.at, text: "Received at destination", user: m.user },
          { at: at(createdDate, "16:00:00"), text: "Dispatched from source", user: m.user },
          { at: at(createdDate, "10:00:00"), text: "Transfer created and approved", user: "Sarah M." },
        ],
      };
    });
  const openTransfers: TransferStatus[] = ["draft", "draft", "submitted", "submitted", "approved", "approved", "in-transit", "in-transit", "in-transit", "cancelled"];
  openTransfers.forEach((status, i) => {
    const from: WarehouseId = i % 3 === 2 ? "wh-branch" : "wh-main";
    const to: WarehouseId = from === "wh-main" ? (i % 2 ? "wh-remote" : "wh-branch") : "wh-remote";
    const pool = active.filter((p) => availableAt(p, from) >= 6);
    const lines = Array.from({ length: int(1, 3) }, (_, j) => pool[(i * 5 + j * 7) % pool.length])
      .filter((p, j, arr) => arr.findIndex((x) => x.id === p.id) === j)
      .map((p) => ({ productId: p.id, quantity: Math.min(availableAt(p, from), int(2, 10)) }));
    const createdDate = addDays(DEMO_TODAY, -int(0, 9));
    const user = pick(STAFF);
    const activity: DocActivity[] = [{ at: at(createdDate, "09:45:00"), text: "Transfer created as draft", user }];
    if (status !== "draft" && status !== "cancelled") activity.push({ at: at(createdDate, "11:30:00"), text: "Submitted for approval", user });
    if (status === "approved" || status === "in-transit") activity.push({ at: at(createdDate, "14:05:00"), text: "Approved", user: "Sarah M." });
    if (status === "in-transit") activity.push({ at: at(addDays(createdDate, 1), "10:20:00"), text: "Marked in transit", user });
    if (status === "cancelled") activity.push({ at: at(createdDate, "17:00:00"), text: "Transfer cancelled", user: "Sarah M." });
    transfers.push({
      id: `trf-${2001 + i}`,
      number: `TRF-${2001 + i}`,
      from,
      to,
      createdDate,
      expectedDate: addDays(createdDate, 3),
      status,
      lines,
      notes: status === "cancelled" ? "Replaced by a direct purchase for the destination." : "",
      createdBy: user,
      activity: activity.reverse(),
    });
  });
  transfers.sort((a, b) => b.createdDate.localeCompare(a.createdDate) || numberOf(b.number) - numberOf(a.number));

  // ── Adjustments ────────────────────────────────────────────────────

  const ADJ_NOTES: Record<AdjustmentReason, string> = {
    damaged: "Packaging crushed; unit not saleable.",
    missing: "Not found during cycle check.",
    expired: "Past shelf life; disposed.",
    found: "Unrecorded units found in overflow bin.",
    "count-correction": "Corrected after recount.",
    other: "",
  };
  const adjCutoff = addDays(DEMO_TODAY, -75);
  const adjustments: StockAdjustment[] = movements
    .filter((m) => m.type === "adjustment" && day(m.at) >= adjCutoff)
    .map((m) => {
      const reason: AdjustmentReason = m.quantity > 0 ? pick(["found", "count-correction"] as const) : pick(["damaged", "missing", "count-correction", "damaged"] as const);
      return { id: m.reference.toLowerCase(), number: m.reference, productId: m.productId, warehouseId: (m.from ?? m.to)!, quantity: m.quantity, reason, notes: ADJ_NOTES[reason], createdBy: m.user, createdAt: m.at, status: "posted" as const };
    });
  [
    ["toner-cartridge", "wh-remote", -1, "expired"],
    ["gaming-mouse", "wh-main", -2, "damaged"],
    ["usb-c-hub", "wh-branch", 3, "found"],
  ].forEach(([productId, warehouseId, quantity, reason], i) => {
    adjustments.unshift({
      id: `adj-${2001 + i}`,
      number: `ADJ-${2001 + i}`,
      productId: productId as string,
      warehouseId: warehouseId as string,
      quantity: quantity as number,
      reason: reason as AdjustmentReason,
      notes: `${ADJ_NOTES[reason as AdjustmentReason]} Draft — not posted.`,
      createdBy: STAFF[i],
      createdAt: at(addDays(DEMO_TODAY, -i), "15:10:00"),
      status: "draft",
    });
  });
  adjustments.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // ── Stocktakes ─────────────────────────────────────────────────────

  const stocktakePlan: [Stocktake["status"], WarehouseId, number, string, string][] = [
    ["completed", "wh-main", -16, "", "John D."],
    ["completed", "wh-branch", -30, "Peripherals", "Mike L."],
    ["in-review", "wh-branch", -2, "", "Mike L."],
    ["in-progress", "wh-remote", 0, "", "Priya K."],
    ["scheduled", "wh-main", 6, "Audio", "John D."],
    ["cancelled", "wh-remote", -21, "Furniture", "Priya K."],
  ];
  const stocktakes: Stocktake[] = stocktakePlan
    .map(([status, warehouseId, offset, category, assignee]) => {
      const scoped = active.filter((p) => !category || p.category === category);
      const lines = scoped.map((p, j) => {
        const expected = onHand(p, warehouseId);
        let counted: number | null = null;
        if (status === "completed" || status === "in-review") counted = Math.max(0, expected + (j % 4 === 1 ? pick([-2, -1, 1]) : 0));
        if (status === "in-progress" && j < Math.ceil(scoped.length * 0.6)) counted = Math.max(0, expected + (j % 5 === 2 ? -1 : 0));
        return { productId: p.id, expected, counted };
      });
      return { id: "", number: "", warehouseId, countDate: addDays(DEMO_TODAY, offset), assignee, category, status, lines, notes: status === "cancelled" ? "Postponed — warehouse closed for maintenance." : "" };
    })
    .sort((a, b) => a.countDate.localeCompare(b.countDate))
    .map((s, i) => ({ ...s, id: `stk-${101 + i}`, number: `STK-${101 + i}` }))
    .reverse();

  return { purchaseOrders: purchaseOrders.reverse(), goodsReceipts, supplierBills, salesOrders: salesOrders.reverse(), fulfilments, salesReturns, transfers, adjustments, stocktakes };
}
