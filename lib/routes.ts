/** Where the app opens. */
export const HOME_ROUTE = "/dashboard";
export const ITEMS_ROUTE = "/items";
export const NEW_ITEM_ROUTE = "/items/new";

export const itemHref = (id: string) => `/items/${encodeURIComponent(id)}`;
export const itemEditHref = (id: string) => `/items/${encodeURIComponent(id)}/edit`;

// The Items list state (search, filters, page…) last shown, so "Back to Items" returns to it.
let itemsListHref = ITEMS_ROUTE;
export const getItemsListHref = () => itemsListHref;
export const setItemsListHref = (href: string) => {
  itemsListHref = href;
};
