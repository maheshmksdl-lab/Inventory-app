"use client";

import { useState, type ReactNode } from "react";
import { ArrowDownIcon, ArrowsDownUpIcon, ArrowUpIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { Skeleton } from "@/components/ui/skeleton";
import { fieldClass, OutlineButton, Pagination, td, th } from "@/components/shared/inventory-ui";
import { cn } from "@/lib/utils";

/**
 * Sortable, paginated table used by every list in the operations modules.
 * Rows come in already filtered; the table owns sorting and paging unless the
 * caller controls the sort (reports export rows in the displayed order).
 */
export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  align?: "right";
  className?: string;
  headerClassName?: string;
}

export interface SortState {
  key: string;
  dir: "asc" | "desc";
}

export const PAGE_SIZES = [10, 25, 50] as const;

export function sortRows<T>(rows: T[], columns: Column<T>[], sort: SortState | null): T[] {
  const col = sort && columns.find((c) => c.key === sort.key);
  if (!col?.sortValue) return rows;
  const dir = sort!.dir === "asc" ? 1 : -1;
  const key = col.sortValue;
  return [...rows].sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    if (typeof ka === "number" && typeof kb === "number") return (ka - kb) * dir;
    return String(ka).localeCompare(String(kb), undefined, { numeric: true }) * dir;
  });
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  caption,
  noun,
  minWidth = 880,
  defaultSort = null,
  sort: controlledSort,
  onSortChange,
  resetKey = "",
  empty,
  footer,
  rowClassName,
  pageSize: initialPageSize = 10,
  paginate = true,
}: {
  rows: T[] | undefined;
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  caption: string;
  /** Plural noun for the pagination summary ("orders"). */
  noun: string;
  minWidth?: number;
  defaultSort?: SortState | null;
  sort?: SortState | null;
  onSortChange?: (s: SortState) => void;
  /** Changing this (e.g. the filters) returns to page 1. */
  resetKey?: string;
  empty: ReactNode;
  footer?: ReactNode;
  rowClassName?: (row: T) => string | undefined;
  pageSize?: number;
  paginate?: boolean;
}) {
  const [ownSort, setOwnSort] = useState<SortState | null>(defaultSort);
  const sort = controlledSort !== undefined ? controlledSort : ownSort;
  const setSort = onSortChange ?? setOwnSort;
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(initialPageSize);
  const [seenKey, setSeenKey] = useState(resetKey);
  if (resetKey !== seenKey) {
    setSeenKey(resetKey);
    setPage(1);
  }

  if (!rows) return <TableSkeleton />;
  if (rows.length === 0) return <div className="border-t border-line-soft">{empty}</div>;

  const sorted = sortRows(rows, columns, sort);
  const pageCount = paginate ? Math.max(1, Math.ceil(sorted.length / size)) : 1;
  const current = Math.min(page, pageCount);
  const visible = paginate ? sorted.slice((current - 1) * size, current * size) : sorted;

  return (
    <>
      <div className="relative overflow-x-auto scrollbar-thin">
        <table className="w-full border-collapse" style={{ minWidth }}>
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-y border-line-soft bg-[#FAFAFB]">
              {columns.map((c) => {
                const active = sort?.key === c.key;
                const numeric = c.align === "right";
                if (!c.sortValue)
                  return (
                    <th key={c.key} scope="col" className={cn(th, numeric && "text-right", c.headerClassName)}>
                      {c.header}
                    </th>
                  );
                const SortIcon = !active ? ArrowsDownUpIcon : sort!.dir === "asc" ? ArrowUpIcon : ArrowDownIcon;
                return (
                  <th key={c.key} scope="col" aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : "none"} className={cn(th, numeric && "text-right", c.headerClassName)}>
                    <button
                      type="button"
                      onClick={() => setSort({ key: c.key, dir: active ? (sort!.dir === "asc" ? "desc" : "asc") : numeric ? "desc" : "asc" })}
                      className={cn("inline-flex items-center gap-1 rounded transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-action", numeric && "flex-row-reverse", active && "text-ink")}
                    >
                      {c.header}
                      <SortIcon size={12} aria-hidden className={active ? "text-brand" : "text-ink-faint"} />
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr
                key={rowKey(r)}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
                className={cn("border-b border-line-soft transition-colors last:border-0", onRowClick && "cursor-pointer hover:bg-[#FCF8F9]", rowClassName?.(r))}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn(td, c.align === "right" && "text-right tabular-nums", c.className)}>
                    {c.cell(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {footer && <tfoot>{footer}</tfoot>}
        </table>
      </div>
      {paginate && (
        <div className="border-t border-line-soft px-4 py-3 sm:px-5 print:hidden">
          <Pagination
            page={current}
            pageCount={pageCount}
            total={sorted.length}
            pageSize={size}
            pageSizes={PAGE_SIZES}
            noun={noun}
            onPage={setPage}
            onPageSize={(s) => {
              setSize(s);
              setPage(1);
            }}
          />
        </div>
      )}
    </>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-1 border-t border-line-soft px-5 py-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 py-2">
          <Skeleton className="h-3.5 w-24" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-48" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="hidden h-3.5 w-24 md:block" />
          <Skeleton className="hidden h-3.5 w-20 md:block" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Search + filters row at the top of a list card. */
export function ListToolbar({ children, onClear, canClear, className }: { children: ReactNode; onClear?: () => void; canClear?: boolean; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2 px-4 pt-4 pb-3 sm:px-5 print:hidden", className)}>
      {children}
      {canClear && onClear && (
        <OutlineButton icon={XIcon} onClick={onClear} className="ml-auto">
          Clear filters
        </OutlineButton>
      )}
    </div>
  );
}

/** From / to date inputs for list filters. */
export function DateRange({ from, to, onChange, label = "Date" }: { from: string; to: string; onChange: (from: string, to: string) => void; label?: string }) {
  return (
    <fieldset className="flex min-w-0 items-center gap-1.5">
      <legend className="sr-only">{label} range</legend>
      <input type="date" value={from} max={to || undefined} onChange={(e) => onChange(e.target.value, to)} aria-label={`${label} from`} className={cn(fieldClass, "w-[142px] text-ink-body", from && "border-brand-soft bg-brand-surface")} />
      <span className="text-[12px] text-ink-muted" aria-hidden>
        to
      </span>
      <input type="date" value={to} min={from || undefined} onChange={(e) => onChange(from, e.target.value)} aria-label={`${label} to`} className={cn(fieldClass, "w-[142px] text-ink-body", to && "border-brand-soft bg-brand-surface")} />
    </fieldset>
  );
}

export const inRange = (date: string, from: string, to: string) => (!from || date.slice(0, 10) >= from) && (!to || date.slice(0, 10) <= to);
export const matches = (term: string, ...values: (string | number | undefined | null)[]) => {
  const t = term.trim().toLowerCase();
  return !t || values.some((v) => v !== undefined && v !== null && String(v).toLowerCase().includes(t));
};
