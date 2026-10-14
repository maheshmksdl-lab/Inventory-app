import type { Icon } from "@phosphor-icons/react";
import {
  ArrowsLeftRightIcon,
  ArrowUUpLeftIcon,
  BarcodeIcon,
  BellRingingIcon,
  ChartBarIcon,
  ClipboardTextIcon,
  ClockCounterClockwiseIcon,
  CoinsIcon,
  GearSixIcon,
  PackageIcon,
  ReceiptIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  SlidersHorizontalIcon,
  SquaresFourIcon,
  StorefrontIcon,
  TagIcon,
  TrayArrowDownIcon,
  TruckIcon,
  UserGearIcon,
  UsersThreeIcon,
  WarehouseIcon,
} from "@phosphor-icons/react/dist/ssr";

export interface NavItem {
  label: string;
  href: string;
  icon: Icon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  { label: "Overview", items: [{ label: "Dashboard", href: "/dashboard", icon: SquaresFourIcon }] },
  {
    label: "Inventory",
    items: [
      { label: "Items & Products", href: "/items", icon: PackageIcon },
      { label: "Categories & Brands", href: "/categories", icon: TagIcon },
      { label: "Warehouses & Locations", href: "/warehouses", icon: WarehouseIcon },
      { label: "Stock Transfers", href: "/stock-transfers", icon: ArrowsLeftRightIcon },
      { label: "Stock Adjustments", href: "/stock-adjustments", icon: SlidersHorizontalIcon },
      { label: "Stocktakes / Counts", href: "/stocktakes", icon: ClipboardTextIcon },
      { label: "Barcode & QR Codes", href: "/barcodes", icon: BarcodeIcon },
    ],
  },
  {
    label: "Purchasing",
    items: [
      { label: "Vendors", href: "/vendors", icon: StorefrontIcon },
      { label: "Purchase Orders", href: "/purchase-orders", icon: ShoppingCartIcon },
      { label: "Goods Receipts", href: "/goods-receipts", icon: TrayArrowDownIcon },
      { label: "Supplier Bills", href: "/supplier-bills", icon: ReceiptIcon },
    ],
  },
  {
    label: "Sales & Fulfilment",
    items: [
      { label: "Customers", href: "/customers", icon: UsersThreeIcon },
      { label: "Sales Orders", href: "/sales-orders", icon: ShoppingBagIcon },
      { label: "Pick, Pack & Ship", href: "/fulfilment", icon: TruckIcon },
      { label: "Sales Returns", href: "/sales-returns", icon: ArrowUUpLeftIcon },
    ],
  },
  {
    label: "Insights",
    items: [
      { label: "Reports & Analytics", href: "/reports", icon: ChartBarIcon },
      { label: "Reorder Alerts", href: "/reorder-alerts", icon: BellRingingIcon },
      { label: "Inventory Valuation", href: "/inventory-valuation", icon: CoinsIcon },
      { label: "Stock Movement History", href: "/stock-movements", icon: ClockCounterClockwiseIcon },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Users & Permissions", href: "/users", icon: UserGearIcon },
      { label: "Settings & Integrations", href: "/settings", icon: GearSixIcon },
    ],
  },
];

const under = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

/** The nav item and group a path belongs to (for the header title and active row). */
export function navFor(pathname: string): { item: NavItem; group: NavGroup } | null {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) if (under(pathname, item.href)) return { item, group };
  }
  return null;
}
