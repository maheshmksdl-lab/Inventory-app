"use client";

/**
 * Stock received vs stock issued over time — a small dependency-free SVG
 * area chart (the reference apps ship no chart library). Hover or arrow keys
 * move a crosshair with a tooltip; the table view lists every value.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { ChartLineIcon, TableIcon } from "@phosphor-icons/react/dist/ssr";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/state-panels";
import { formatDate, formatNumber, formatShortDate } from "@/lib/format";
import type { TrendPoint } from "@/lib/types/inventory";
import { cn } from "@/lib/utils";

export type Granularity = "daily" | "weekly";

const SERIES = [
  { key: "received", label: "Stock Received", color: "var(--series-received)" },
  { key: "issued", label: "Stock Issued", color: "var(--series-issued)" },
] as const;

/** Weekly buckets of 7 days, labelled by their first day. */
export function bucket(points: TrendPoint[], g: Granularity): (TrendPoint & { end: string })[] {
  if (g === "daily") return points.map((p) => ({ ...p, end: p.date }));
  const out: (TrendPoint & { end: string })[] = [];
  for (let i = 0; i < points.length; i += 7) {
    const chunk = points.slice(i, i + 7);
    out.push({
      date: chunk[0].date,
      end: chunk[chunk.length - 1].date,
      received: chunk.reduce((s, p) => s + p.received, 0),
      issued: chunk.reduce((s, p) => s + p.issued, 0),
    });
  }
  return out;
}

/** A "nice" axis maximum and step (1, 2, 2.5, 5 × 10^n). */
function niceScale(max: number, ticks = 4) {
  if (max <= 0) return { top: ticks, step: 1 };
  const raw = max / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  return { top: step * Math.ceil(max / step), step };
}

/** Smooth path through points that never overshoots (monotone cubic, Fritsch–Carlson). */
function monotonePath(pts: [number, number][]): string {
  const n = pts.length;
  if (n === 0) return "";
  if (n === 1) return `M${pts[0][0]},${pts[0][1]}`;
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1][0] - pts[i][0]);
    m.push((pts[i + 1][1] - pts[i][1]) / dx[i]);
  }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) t.push(m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2);
  t.push(m[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const h = a * a + b * b;
    if (h > 9) {
      const k = 3 / Math.sqrt(h);
      t[i] = k * a * m[i];
      t[i + 1] = k * b * m[i];
    }
  }
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${pts[i][0] + h},${pts[i][1] + t[i] * h} ${pts[i + 1][0] - h},${pts[i + 1][1] - t[i + 1] * h} ${pts[i + 1][0]},${pts[i + 1][1]}`;
  }
  return d;
}

/** Element size, so the chart fills whatever space its card gives it. */
function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setSize({ width: Math.floor(entry.contentRect.width), height: Math.floor(entry.contentRect.height) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

const periodLabel = (p: { date: string; end: string }, g: Granularity) => (g === "daily" ? formatDate(p.date) : `${formatShortDate(p.date)} – ${formatShortDate(p.end)}`);

const MIN_HEIGHT = 232;
const PAD = { top: 12, right: 12, bottom: 28, left: 44 };

function Chart({ data, granularity }: { data: (TrendPoint & { end: string })[]; granularity: Granularity }) {
  const [wrapRef, size] = useSize<HTMLDivElement>();
  const width = size.width;
  const HEIGHT = Math.max(MIN_HEIGHT, size.height);
  const [active, setActive] = useState<number | null>(null);
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const { top, step } = niceScale(Math.max(1, ...data.map((d) => Math.max(d.received, d.issued))));
  const x = (i: number) => PAD.left + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  // Label at most ~7 x positions so they never collide.
  const every = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(plotW / 78))));

  const paths = useMemo(
    () =>
      SERIES.map((s) => {
        const pts = data.map((d, i) => [x(i), y(d[s.key])] as [number, number]);
        const line = monotonePath(pts);
        const area = pts.length ? `${line} L${pts[pts.length - 1][0]},${PAD.top + plotH} L${pts[0][0]},${PAD.top + plotH} Z` : "";
        return { ...s, line, area };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, width, HEIGHT, top],
  );

  const pick = (clientX: number, rect: DOMRect) => {
    const rel = clientX - rect.left - PAD.left;
    const i = Math.round((rel / Math.max(1, plotW)) * (data.length - 1));
    setActive(Math.max(0, Math.min(data.length - 1, i)));
  };

  const a = active !== null ? data[active] : null;
  const tipLeft = active !== null ? Math.min(Math.max(x(active) - 80, 0), Math.max(0, width - 172)) : 0;

  return (
    <div ref={wrapRef} className="relative min-h-[232px] flex-1">
      {width > 0 && (
        <svg
          className="absolute inset-0 block rounded-md outline-none focus-visible:ring-3 focus-visible:ring-brand-10"
          width={width}
          height={HEIGHT}
          role="img"
          tabIndex={0}
          aria-label={`Stock received and issued, ${granularity}. Use left and right arrow keys to read each ${granularity === "daily" ? "day" : "week"}.`}
          onPointerMove={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive((v) => v ?? data.length - 1)}
          onBlur={() => setActive(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") setActive((v) => Math.min(data.length - 1, (v ?? -1) + 1));
            if (e.key === "ArrowLeft") setActive((v) => Math.max(0, (v ?? data.length) - 1));
            if (e.key === "Home") setActive(0);
            if (e.key === "End") setActive(data.length - 1);
          }}
        >
          <defs>
            {SERIES.map((s) => (
              <linearGradient key={s.key} id={`trend-fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={s.key === "received" ? 0.14 : 0.1} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          {/* Grid and y-axis */}
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="#EEF0F3" strokeDasharray={t === 0 ? undefined : "3 4"} />
              <text x={PAD.left - 10} y={y(t)} dy="0.32em" textAnchor="end" className="fill-ink-muted text-[11px] tabular-nums">
                {t >= 1000 ? `${formatNumber(t / 1000)}K` : t}
              </text>
            </g>
          ))}
          {/* X labels, counted back from the latest period so it is always labelled */}
          {data.map((d, i) =>
            (data.length - 1 - i) % every === 0 ? (
              <text key={d.date} x={x(i)} y={HEIGHT - 8} textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"} className="fill-ink-muted text-[11px]">
                {formatShortDate(d.date)}
              </text>
            ) : null,
          )}
          {paths.map((p) => (
            <path key={`${p.key}-area`} d={p.area} fill={`url(#trend-fill-${p.key})`} />
          ))}
          {paths.map((p) => (
            <path key={`${p.key}-line`} d={p.line} fill="none" stroke={p.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {a && active !== null && (
            <g pointerEvents="none">
              <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + plotH} stroke="#98A2B3" strokeDasharray="3 3" />
              {SERIES.map((s) => (
                <circle key={s.key} cx={x(active)} cy={y(a[s.key])} r={4.5} fill={s.color} stroke="#fff" strokeWidth={2} />
              ))}
            </g>
          )}
        </svg>
      )}
      {a && (
        <div className="pointer-events-none absolute top-1 z-10 w-[172px] rounded-lg border border-line bg-white px-3 py-2 shadow-pop" style={{ left: tipLeft }} aria-live="polite">
          <p className="text-[12px] leading-4 font-semibold text-ink">{periodLabel(a, granularity)}</p>
          {SERIES.map((s) => (
            <p key={s.key} className="mt-1 flex items-center gap-2 text-[12px] leading-4 text-ink-body">
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
              <span className="flex-1">{s.label}</span>
              <span className="font-semibold text-ink tabular-nums">{formatNumber(a[s.key])}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function TrendTable({ data, granularity }: { data: (TrendPoint & { end: string })[]; granularity: Granularity }) {
  return (
    <div className="relative max-h-[300px] min-h-[232px] flex-1 overflow-auto scrollbar-thin">
      <table className="w-full border-collapse text-[12.5px]">
        <caption className="sr-only">Stock received and issued by {granularity === "daily" ? "day" : "week"}</caption>
        <thead className="sticky top-0 bg-white">
          <tr className="border-b border-line">
            <th scope="col" className="px-2 py-2 text-left text-table-header text-ink-muted">
              {granularity === "daily" ? "Date" : "Week"}
            </th>
            <th scope="col" className="px-2 py-2 text-right text-table-header text-ink-muted">
              Received
            </th>
            <th scope="col" className="px-2 py-2 text-right text-table-header text-ink-muted">
              Issued
            </th>
          </tr>
        </thead>
        <tbody>
          {[...data].reverse().map((d) => (
            <tr key={d.date} className="border-b border-line-soft last:border-0">
              <td className="px-2 py-1.5 text-ink-body">{periodLabel(d, granularity)}</td>
              <td className="px-2 py-1.5 text-right text-ink tabular-nums">{formatNumber(d.received)}</td>
              <td className="px-2 py-1.5 text-right text-ink tabular-nums">{formatNumber(d.issued)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Chart body with legend and a chart / table switch. Granularity is chosen by the card header. */
export function InventoryTrend({ points, granularity, loading }: { points: TrendPoint[] | undefined; granularity: Granularity; loading: boolean }) {
  const [asTable, setAsTable] = useState(false);
  const data = useMemo(() => (points ? bucket(points, granularity) : []), [points, granularity]);
  const empty = !loading && data.every((d) => d.received === 0 && d.issued === 0);

  return (
    <div className="flex flex-1 flex-col px-5 pb-4">
      <div className="mb-2 flex items-center gap-3">
        <ul className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Legend">
          {SERIES.map((s) => (
            <li key={s.key} className="inline-flex items-center gap-1.5 text-[12px] text-ink-body">
              <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
              {s.label}
            </li>
          ))}
        </ul>
        <div className="ml-auto flex shrink-0 gap-0.5 rounded-lg bg-[#F2F4F7] p-0.5" role="group" aria-label="Trend view">
          {[
            { on: false, icon: ChartLineIcon, label: "Chart" },
            { on: true, icon: TableIcon, label: "Table" },
          ].map(({ on, icon: IconCmp, label }) => (
            <button
              key={label}
              type="button"
              aria-pressed={asTable === on}
              aria-label={`Show as ${label.toLowerCase()}`}
              onClick={() => setAsTable(on)}
              className={cn("inline-flex size-7 items-center justify-center rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-brand-action", asTable === on ? "bg-white text-ink shadow-card" : "text-ink-muted hover:text-ink")}
            >
              <IconCmp size={15} aria-hidden />
            </button>
          ))}
        </div>
      </div>
      {loading && !points ? (
        <Skeleton className="h-[232px] w-full rounded-lg" />
      ) : empty ? (
        <EmptyState icon={ChartLineIcon} title="No stock movements in this period" hint="Try a longer date range or another warehouse." className="h-[232px] justify-center py-0" />
      ) : asTable ? (
        <TrendTable data={data} granularity={granularity} />
      ) : (
        <Chart data={data} granularity={granularity} />
      )}
    </div>
  );
}
