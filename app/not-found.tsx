import Image from "next/image";
import Link from "next/link";
import { CompassIcon } from "@phosphor-icons/react/dist/ssr";
import { LOGO_SRC } from "@/components/layout/app-logo";
import { EmptyState } from "@/components/shared/state-panels";

/** Unmatched URLs render outside the app shell, so this page brings its own logo and way back. */
export default function NotFound() {
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center bg-[#F8F9FB] p-6">
      <Link href="/dashboard" aria-label="EVOQ Inventory — go to Dashboard" className="mb-6 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action">
        <Image src={LOGO_SRC} alt="EVOQ Inventory" width={176} height={48} className="h-10 w-auto" unoptimized />
      </Link>
      <div className="w-full max-w-md rounded-2xl border border-line bg-white shadow-card">
        <EmptyState
          icon={CompassIcon}
          title="This page isn't available"
          hint="The link may be wrong, or the page has moved."
          action={
            <Link
              href="/dashboard"
              className="inline-flex h-9 items-center rounded-lg bg-brand px-4 text-button text-white transition-colors hover:bg-brand-press focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action"
            >
              Go to Dashboard
            </Link>
          }
        />
      </div>
    </main>
  );
}
