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
  /** False until the module's screens exist: shown, but not a link. */
  available: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

const soon = (label: string, href: string, icon: Icon): NavItem => ({ label, href, icon, available: false });

export const NAV_GROUPS: NavGroup[] = [
  { label: "Overview", items: [{ label: "Dashboard", href: "/dashboard", icon: SquaresFourIcon, available: true }] },
  {
    label: "Inventory",
    items: [
      { label: "Items & Products", href: "/items", icon: PackageIcon, available: true },
      soon("Categories & Brands", "/categories", TagIcon),
      soon("Warehouses & Locations", "/warehouses", WarehouseIcon),
      soon("Stock Transfers", "/transfers", ArrowsLeftRightIcon),
      soon("Stock Adjustments", "/adjustments", SlidersHorizontalIcon),
      soon("Stocktakes / Counts", "/stocktakes", ClipboardTextIcon),
      soon("Barcode & QR Codes", "/barcodes", BarcodeIcon),
    ],
  },
  {
    label: "Purchasing",
    items: [
      soon("Vendors", "/vendors", StorefrontIcon),
      soon("Purchase Orders", "/purchase-orders", ShoppingCartIcon),
      soon("Goods Receipts", "/goods-receipts", TrayArrowDownIcon),
      soon("Supplier Bills", "/supplier-bills", ReceiptIcon),
    ],
  },
  {
    label: "Sales & Fulfilment",
    items: [
      soon("Customers", "/customers", UsersThreeIcon),
      soon("Sales Orders", "/sales-orders", ShoppingBagIcon),
      soon("Pick, Pack & Ship", "/fulfilment", TruckIcon),
      soon("Sales Returns", "/returns", ArrowUUpLeftIcon),
    ],
  },
  {
    label: "Insights",
    items: [
      soon("Reports & Analytics", "/reports", ChartBarIcon),
      soon("Reorder Alerts", "/reorder-alerts", BellRingingIcon),
      soon("Inventory Valuation", "/valuation", CoinsIcon),
      soon("Stock Movement History", "/movements", ClockCounterClockwiseIcon),
    ],
  },
  {
    label: "Administration",
    items: [soon("Users & Permissions", "/users", UserGearIcon), soon("Settings & Integrations", "/settings", GearSixIcon)],
  },
];

const under = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

/** The nav item and group a path belongs to (for the header title and active row). */
export function navFor(pathname: string): { item: NavItem; group: NavGroup } | null {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) if (item.available && under(pathname, item.href)) return { item, group };
  }
  return null;
}
