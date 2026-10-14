import { ArrowsLeftRightIcon, BellRingingIcon, PackageIcon, WarehouseIcon } from "@phosphor-icons/react/dist/ssr";

/**
 * Sign-in screens: no sidebar or header. A light form column, and on wide
 * screens a quiet product panel on a pale brand surface.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh bg-[#F8F9FB] lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <main id="main" className="flex items-center justify-center px-4 py-10 sm:px-6">
        {children}
      </main>
      <aside aria-hidden className="relative hidden overflow-hidden border-l border-line bg-inventory-surface lg:flex lg:items-center lg:justify-center">
        <div className="w-full max-w-[400px] px-10">
          <p className="text-[12px] font-medium tracking-[0.06em] text-inventory-depth/70 uppercase">EVOQ Inventory</p>
          <p className="mt-2 text-[22px] leading-8 font-semibold text-ink">Stock, orders and warehouses in one calm workspace.</p>
          <div className="mt-8 space-y-3">
            {[
              { icon: PackageIcon, label: "Items tracked", value: "25 products", note: "across 3 warehouses" },
              { icon: BellRingingIcon, label: "Reorder alerts", value: "Low stock flagged", note: "before shelves run empty" },
              { icon: ArrowsLeftRightIcon, label: "Transfers", value: "Main → Branch", note: "requested, approved, received" },
              { icon: WarehouseIcon, label: "Locations", value: "Bins & zones", note: "for faster picking" },
            ].map(({ icon: IconCmp, label, value, note }) => (
              <div key={label} className="flex items-center gap-3 rounded-xl border border-white/80 bg-white/90 px-4 py-3 shadow-card">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-inventory-tint text-inventory">
                  <IconCmp size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[12px] leading-4 text-ink-muted">{label}</span>
                  <span className="block text-[14px] leading-5 font-semibold text-ink">{value}</span>
                  <span className="block text-[12px] leading-4 text-ink-muted">{note}</span>
                </span>
              </div>
            ))}
          </div>
          <p className="mt-6 text-[12px] leading-4 text-ink-muted">Illustration of the demo workspace.</p>
        </div>
      </aside>
    </div>
  );
}
