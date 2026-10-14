"use client";

import type { Column } from "@/components/shared/data-table";
import { TextLink } from "@/components/shared/doc-ui";
import { ToneBadge } from "@/components/shared/inventory-ui";
import { warehouseLabel } from "@/lib/derive";
import { docTotals } from "@/lib/doc-math";
import { formatCurrency, formatDate } from "@/lib/format";
import { SO_STATUS } from "@/lib/operations-meta";
import { recordHref } from "@/lib/routes";
import type { CustomerRecord, SalesOrder, WarehouseRecord } from "@/lib/types/operations";

export const soTotal = (so: SalesOrder) => docTotals(so.lines).total;
export const customerLabel = (customers: CustomerRecord[] | undefined, id: string) => customers?.find((c) => c.id === id)?.name ?? "—";

export function soColumns({ customers, warehouses, hideCustomer }: { customers?: CustomerRecord[]; warehouses?: WarehouseRecord[]; hideCustomer?: boolean }): Column<SalesOrder>[] {
  const cols: (Column<SalesOrder> | false)[] = [
    {
      key: "number",
      header: "SO number",
      sortValue: (s) => s.number,
      cell: (s) => (
        <TextLink href={recordHref("salesOrders", s.id)} className="font-mono text-[12.5px] font-semibold whitespace-nowrap">
          {s.number}
        </TextLink>
      ),
    },
    !hideCustomer && {
      key: "customer",
      header: "Customer",
      sortValue: (s) => customerLabel(customers, s.customerId),
      cell: (s) => (
        <TextLink href={recordHref("customers", s.customerId)} className="font-normal whitespace-nowrap">
          {customerLabel(customers, s.customerId)}
        </TextLink>
      ),
    },
    { key: "orderDate", header: "Order date", sortValue: (s) => s.orderDate, cell: (s) => <span className="whitespace-nowrap">{formatDate(s.orderDate)}</span> },
    { key: "delivery", header: "Delivery date", sortValue: (s) => s.deliveryDate, cell: (s) => <span className="whitespace-nowrap">{formatDate(s.deliveryDate)}</span> },
    { key: "warehouse", header: "Warehouse", sortValue: (s) => warehouseLabel(warehouses, s.warehouseId), cell: (s) => <span className="whitespace-nowrap">{warehouseLabel(warehouses, s.warehouseId)}</span> },
    { key: "total", header: "Total", align: "right", sortValue: soTotal, cell: (s) => <span className="font-semibold whitespace-nowrap text-ink">{formatCurrency(soTotal(s))}</span> },
    { key: "status", header: "Fulfilment status", sortValue: (s) => s.status, cell: (s) => <ToneBadge tone={SO_STATUS[s.status]} /> },
  ];
  return cols.filter(Boolean) as Column<SalesOrder>[];
}
