"use client";

import type { Column } from "@/components/shared/data-table";
import { TextLink } from "@/components/shared/doc-ui";
import { ToneBadge } from "@/components/shared/inventory-ui";
import { warehouseLabel } from "@/lib/derive";
import { docTotals } from "@/lib/doc-math";
import { formatCurrency, formatDate } from "@/lib/format";
import { PO_STATUS } from "@/lib/operations-meta";
import { recordHref } from "@/lib/routes";
import type { PurchaseOrder, VendorRecord, WarehouseRecord } from "@/lib/types/operations";

export const poTotal = (po: PurchaseOrder) => docTotals(po.lines).total;
export const poReceivedPct = (po: PurchaseOrder) => {
  const ordered = po.lines.reduce((s, l) => s + l.quantity, 0);
  return ordered ? Math.round((po.lines.reduce((s, l) => s + Math.min(l.received, l.quantity), 0) / ordered) * 100) : 0;
};
export const vendorLabel = (vendors: VendorRecord[] | undefined, id: string) => vendors?.find((v) => v.id === id)?.name ?? "—";

export function poColumns({ vendors, warehouses, hideVendor }: { vendors?: VendorRecord[]; warehouses?: WarehouseRecord[]; hideVendor?: boolean }): Column<PurchaseOrder>[] {
  const cols: (Column<PurchaseOrder> | false)[] = [
    {
      key: "number",
      header: "PO number",
      sortValue: (p) => p.number,
      cell: (p) => (
        <TextLink href={recordHref("purchaseOrders", p.id)} className="font-mono text-[12.5px] font-semibold whitespace-nowrap">
          {p.number}
        </TextLink>
      ),
    },
    !hideVendor && {
      key: "vendor",
      header: "Vendor",
      sortValue: (p) => vendorLabel(vendors, p.vendorId),
      cell: (p) => (
        <TextLink href={recordHref("vendors", p.vendorId)} className="font-normal whitespace-nowrap">
          {vendorLabel(vendors, p.vendorId)}
        </TextLink>
      ),
    },
    { key: "orderDate", header: "Order date", sortValue: (p) => p.orderDate, cell: (p) => <span className="whitespace-nowrap">{formatDate(p.orderDate)}</span> },
    { key: "expected", header: "Expected delivery", sortValue: (p) => p.expectedDate, cell: (p) => <span className="whitespace-nowrap">{formatDate(p.expectedDate)}</span> },
    { key: "warehouse", header: "Warehouse", sortValue: (p) => warehouseLabel(warehouses, p.warehouseId), cell: (p) => <span className="whitespace-nowrap">{warehouseLabel(warehouses, p.warehouseId)}</span> },
    { key: "total", header: "Total", align: "right", sortValue: poTotal, cell: (p) => <span className="font-semibold whitespace-nowrap text-ink">{formatCurrency(poTotal(p))}</span> },
    { key: "status", header: "Status", sortValue: (p) => p.status, cell: (p) => <ToneBadge tone={PO_STATUS[p.status]} /> },
  ];
  return cols.filter(Boolean) as Column<PurchaseOrder>[];
}
