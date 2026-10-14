"use client";

import Link from "next/link";
import { ArrowRightIcon, CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr";
import { PrototypeNote } from "@/components/shared/doc-ui";
import { PageHeading, PageShell } from "@/components/shared/inventory-ui";
import { recordHref } from "@/lib/routes";
import { REPORTS, type ReportDef } from "./report-defs";

const GROUPS: ReportDef["group"][] = ["Stock", "Value", "Orders"];

export function ReportsView() {
  return (
    <PageShell>
      <PageHeading crumbs={[{ label: "Insights" }, { label: "Reports & Analytics" }]} title="Reports & Analytics" description="Ready-made reports over the shared demo data. Each opens with filters, sorting, totals, CSV export and a print layout." />
      <PrototypeNote className="mt-5" label="Demo data">
        Figures come from the sample catalogue, ledger and orders used across this prototype. They are not real business data.
      </PrototypeNote>
      {GROUPS.map((g) => (
        <section key={g} className="mt-6" aria-labelledby={`reports-${g}`}>
          <h2 id={`reports-${g}`} className="mb-3 text-nav-group-label text-ink-muted uppercase">
            {g}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {REPORTS.filter((r) => r.group === g).map((r) => {
              const IconCmp = r.icon;
              return (
                <li key={r.id}>
                  <Link
                    href={recordHref("reports", r.id)}
                    className="group flex h-full items-start gap-3.5 rounded-xl border border-line bg-card p-4 shadow-card transition-colors hover:border-brand-soft hover:bg-brand-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action"
                  >
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F2F4F7] text-[#475467] group-hover:bg-inventory-tint group-hover:text-inventory" aria-hidden>
                      <IconCmp size={20} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-[14px] leading-5 font-semibold text-ink">
                        {r.title}
                        <ArrowRightIcon size={13} weight="bold" aria-hidden className="text-ink-faint transition-colors group-hover:text-brand" />
                      </span>
                      <span className="mt-0.5 block text-[12.5px] leading-5 text-ink-muted">{r.description}</span>
                      <span className="mt-2 inline-flex items-center gap-1 text-[11.5px] text-ink-muted">
                        <CalendarBlankIcon size={12} aria-hidden /> {r.dated ? "Date range" : "Current snapshot"} · {r.columns.length} columns
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </PageShell>
  );
}
