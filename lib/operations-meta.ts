/**
 * Labels and status tones for the operations modules. Tones are semantic
 * (neutral → blue → violet → green, amber for waiting, red for problems) and
 * always carry a text label.
 */
import { tone, type Tone } from "@/lib/inventory-meta";
import type { PurchaseOrderStatus, SalesOrderStatus } from "@/lib/types/inventory";
import type {
  AdjustmentReason,
  BillStatus,
  FulfilmentStage,
  ReceiptStatus,
  RecordStatus,
  ReturnOutcome,
  ReturnStatus,
  RoleId,
  StocktakeStatus,
  TransferStatus,
} from "@/lib/types/operations";

const neutral = (label: string) => tone(label, "var(--neutral-fg)", "var(--neutral-bg)");
const info = (label: string) => tone(label, "var(--info)", "var(--info-bg)");
const violet = (label: string) => tone(label, "var(--violet)", "var(--violet-bg)");
const success = (label: string) => tone(label, "var(--success)", "var(--success-bg)");
const warning = (label: string) => tone(label, "var(--warning)", "var(--warning-bg)");
const danger = (label: string) => tone(label, "var(--danger)", "var(--danger-bg)");
const brand = (label: string) => tone(label, "var(--inventory-depth)", "var(--inventory-tint)");

export const RECORD_STATUS: Record<RecordStatus, Tone> = { active: success("Active"), archived: neutral("Archived") };

export const PO_STATUS: Record<PurchaseOrderStatus, Tone> = {
  draft: neutral("Draft"),
  "pending-approval": warning("Pending Approval"),
  confirmed: info("Confirmed"),
  "partially-received": violet("Partially Received"),
  completed: success("Completed"),
  cancelled: danger("Cancelled"),
};

export const SO_STATUS: Record<SalesOrderStatus, Tone> = {
  draft: neutral("Draft"),
  confirmed: info("Confirmed"),
  "partially-fulfilled": violet("Partially Fulfilled"),
  fulfilled: success("Fulfilled"),
  cancelled: danger("Cancelled"),
};

export const RECEIPT_STATUS: Record<ReceiptStatus, Tone> = {
  draft: neutral("Draft"),
  partial: violet("Partially Received"),
  received: success("Received"),
  cancelled: danger("Cancelled"),
};

export const BILL_STATUS: Record<BillStatus, Tone> = {
  draft: neutral("Draft"),
  "awaiting-review": warning("Awaiting Review"),
  due: info("Due"),
  overdue: danger("Overdue"),
  paid: success("Paid"),
};

export const TRANSFER_STATUS: Record<TransferStatus, Tone> = {
  draft: neutral("Draft"),
  submitted: warning("Submitted"),
  approved: info("Approved"),
  "in-transit": violet("In Transit"),
  received: success("Received"),
  cancelled: danger("Cancelled"),
};
/** The transfer workflow in order (Cancelled is a side exit). */
export const TRANSFER_FLOW: TransferStatus[] = ["draft", "submitted", "approved", "in-transit", "received"];

export const ADJUSTMENT_STATUS: Record<"draft" | "posted", Tone> = { draft: neutral("Draft"), posted: success("Posted (history)") };

export const ADJUSTMENT_REASON: Record<AdjustmentReason, string> = {
  damaged: "Damaged",
  missing: "Missing",
  expired: "Expired",
  found: "Found",
  "count-correction": "Count Correction",
  other: "Other",
};

export const STOCKTAKE_STATUS: Record<StocktakeStatus, Tone> = {
  scheduled: neutral("Scheduled"),
  "in-progress": info("In Progress"),
  "in-review": warning("In Review"),
  completed: success("Completed"),
  cancelled: danger("Cancelled"),
};

export const FULFILMENT_STAGE: Record<FulfilmentStage, Tone> = {
  "to-pick": neutral("To Pick"),
  picking: info("Picking"),
  packed: violet("Packed"),
  dispatched: success("Dispatched (simulated)"),
};
export const FULFILMENT_FLOW: FulfilmentStage[] = ["to-pick", "picking", "packed", "dispatched"];
export const CARRIERS = ["BlueDart", "Delhivery", "DTDC", "India Post", "Own fleet"];

export const RETURN_STATUS: Record<ReturnStatus, Tone> = {
  requested: warning("Requested"),
  received: info("Received"),
  inspected: violet("Inspected"),
  closed: success("Closed"),
  rejected: danger("Rejected"),
};
export const RETURN_OUTCOME: Record<Exclude<ReturnOutcome, "">, Tone> = {
  restock: success("Restock"),
  quarantine: warning("Quarantine"),
  "write-off": danger("Write-off"),
};
export const RETURN_REASONS = ["Damaged on arrival", "Defective", "Wrong item sent", "No longer needed", "Not as described", "Other"];

export const USER_STATUS: Record<"active" | "invited" | "suspended", Tone> = { active: success("Active"), invited: info("Invited"), suspended: neutral("Suspended") };

export const ALERT_SEVERITY: Record<"critical" | "high" | "medium", Tone> = {
  critical: danger("Out of stock"),
  high: tone("High", "#B93815", "#FEF6EE"),
  medium: warning("Low"),
};

export const INACTIVE_TONE = neutral("Inactive");
export const BRAND_TONE = brand;

// ── Roles & permissions (UI preview only — nothing is enforced) ──────

export const PERMISSION_AREAS = ["Items & catalogue", "Warehouses & stock", "Purchasing", "Sales & fulfilment", "Reports", "Users & settings"] as const;
export type Access = "full" | "edit" | "view" | "none";

export const ROLES: { id: RoleId; label: string; description: string; access: Access[] }[] = [
  { id: "administrator", label: "Administrator", description: "Everything, including users and settings.", access: ["full", "full", "full", "full", "full", "full"] },
  { id: "inventory-manager", label: "Inventory Manager", description: "Catalogue, stock control and approvals.", access: ["full", "full", "view", "view", "full", "none"] },
  { id: "purchasing-manager", label: "Purchasing Manager", description: "Vendors, purchase orders, receipts and bills.", access: ["view", "view", "full", "none", "view", "none"] },
  { id: "sales-staff", label: "Sales Staff", description: "Customers, sales orders and returns.", access: ["view", "view", "none", "edit", "view", "none"] },
  { id: "warehouse-staff", label: "Warehouse Staff", description: "Receiving, transfers, counts and picking.", access: ["view", "edit", "view", "edit", "none", "none"] },
  { id: "viewer", label: "Read-only Viewer", description: "Can look, can't change anything.", access: ["view", "view", "view", "view", "view", "none"] },
];
export const roleLabel = (id: RoleId) => ROLES.find((r) => r.id === id)?.label ?? id;
export const ACCESS_LABEL: Record<Access, string> = { full: "Full access", edit: "Create & edit", view: "View only", none: "No access" };
