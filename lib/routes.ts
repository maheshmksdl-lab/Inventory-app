/** Where Log in lands. */
export const HOME_ROUTE = "/dashboard";
/** The app opens here, as EVOQ Projects does. */
export const LOGIN_ROUTE = "/login";
export const ITEMS_ROUTE = "/items";
export const NEW_ITEM_ROUTE = "/items/new";

export const itemHref = (id: string) => `/items/${encodeURIComponent(id)}`;
export const itemEditHref = (id: string) => `/items/${encodeURIComponent(id)}/edit`;
export const itemVariantNewHref = (id: string) => `/items/${encodeURIComponent(id)}/variants/new`;
/** New item form, optionally pre-filled as a copy of another item. */
export const itemCloneHref = (id: string) => `${NEW_ITEM_ROUTE}?clone=${encodeURIComponent(id)}`;

// The Items list state (search, filters, page…) last shown, so "Back to Items" returns to it.
let itemsListHref = ITEMS_ROUTE;
export const getItemsListHref = () => itemsListHref;
export const setItemsListHref = (href: string) => {
  itemsListHref = href;
};

/** Module list routes (match the sidebar). */
export const ROUTES = {
  categories: "/categories",
  warehouses: "/warehouses",
  transfers: "/stock-transfers",
  adjustments: "/stock-adjustments",
  stocktakes: "/stocktakes",
  barcodes: "/barcodes",
  vendors: "/vendors",
  purchaseOrders: "/purchase-orders",
  goodsReceipts: "/goods-receipts",
  supplierBills: "/supplier-bills",
  customers: "/customers",
  salesOrders: "/sales-orders",
  fulfilment: "/fulfilment",
  salesReturns: "/sales-returns",
  reports: "/reports",
  reorderAlerts: "/reorder-alerts",
  valuation: "/inventory-valuation",
  movements: "/stock-movements",
  users: "/users",
  settings: "/settings",
} as const;

export type ModuleKey = keyof typeof ROUTES;

/** Detail page of a record in a module: /purchase-orders/po-1042 */
export const recordHref = (module: ModuleKey, id: string) => `${ROUTES[module]}/${encodeURIComponent(id)}`;
export const newHref = (module: ModuleKey, params?: Record<string, string>) => `${ROUTES[module]}/new${params ? `?${new URLSearchParams(params)}` : ""}`;
